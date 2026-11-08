import { 
  SignalingMessage, 
  SignalingMessageType, 
  RemoteSessionStatus 
} from '../../../../packages/shared/src/types';
import { DeviceService } from '../services/device.service';
import { SessionService } from '../services/session.service';

export interface ConnectedPeer {
  id: string;             // clientId or deviceId
  peerType: 'AGENT' | 'CLIENT';
  deviceId: string;
  userId: string;
  send: (msg: SignalingMessage) => void;
}

export class SignalingHub {
  private peers = new Map<string, ConnectedPeer>(); // key: peerId
  // deviceId -> agentPeerId
  private agentMap = new Map<string, string>();

  constructor(
    private deviceService: DeviceService,
    private sessionService: SessionService
  ) {}

  /**
   * Đăng ký một Peer mới vào Hub kèm xác thực Token
   */
  public registerPeer(peer: {
    peerId: string;
    peerType: 'AGENT' | 'CLIENT';
    deviceId: string;
    token: string;
    send: (msg: SignalingMessage) => void;
  }): { success: boolean; error?: string } {
    try {
      // 1. Xác thực Device Token
      const validated = this.deviceService.validateDeviceToken(peer.token);
      if (validated.deviceId !== peer.deviceId) {
        return { success: false, error: 'Token does not match device ID' };
      }

      const connected: ConnectedPeer = {
        id: peer.peerId,
        peerType: peer.peerType,
        deviceId: peer.deviceId,
        userId: validated.userId,
        send: peer.send
      };

      this.peers.set(peer.peerId, connected);

      if (peer.peerType === 'AGENT') {
        this.agentMap.set(peer.deviceId, peer.peerId);
      }

      connected.send({
        type: SignalingMessageType.REGISTERED,
        senderId: 'SERVER',
        targetId: peer.peerId,
        payload: { deviceId: peer.deviceId, userId: validated.userId }
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Authentication failed' };
    }
  }

  /**
   * Hủy đăng ký Peer khi ngắt kết nối WebSocket
   */
  public unregisterPeer(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      if (peer.peerType === 'AGENT' && this.agentMap.get(peer.deviceId) === peerId) {
        this.agentMap.delete(peer.deviceId);
      }
      this.peers.delete(peerId);
    }
  }

  /**
   * Định tuyến và xử lý các thông điệp Signaling WebRTC (Offer, Answer, Candidate)
   */
  public async handleMessage(senderPeerId: string, message: SignalingMessage): Promise<void> {
    const sender = this.peers.get(senderPeerId);
    if (!sender) {
      throw new Error(`Unauthorized peer ${senderPeerId}`);
    }

    switch (message.type) {
      case SignalingMessageType.OFFER: {
        // Client gửi Offer cho Agent máy tính
        if (!message.targetId && message.payload?.deviceId) {
          message.targetId = this.agentMap.get(message.payload.deviceId);
        }
        if (!message.targetId) {
          sender.send({
            type: SignalingMessageType.ERROR,
            error: 'Target Windows Agent not connected to Signaling Hub'
          });
          return;
        }

        const target = this.peers.get(message.targetId);
        if (!target) {
          sender.send({
            type: SignalingMessageType.ERROR,
            error: 'Target peer offline'
          });
          return;
        }

        // Kích hoạt RemoteSession sang ACTIVE
        if (message.sessionId) {
          await this.sessionService.activateSession(message.sessionId);
        }

        target.send({
          ...message,
          senderId: sender.id
        });
        break;
      }

      case SignalingMessageType.ANSWER: {
        // Agent trả lời Answer cho Client
        if (!message.targetId) {
          sender.send({ type: SignalingMessageType.ERROR, error: 'Target ID required for answer' });
          return;
        }
        const target = this.peers.get(message.targetId);
        if (target) {
          target.send({
            ...message,
            senderId: sender.id
          });
        }
        break;
      }

      case SignalingMessageType.CANDIDATE: {
        // Chuyển tiếp ICE Candidate
        if (!message.targetId) return;
        const target = this.peers.get(message.targetId);
        if (target) {
          target.send({
            ...message,
            senderId: sender.id
          });
        }
        break;
      }

      case SignalingMessageType.SESSION_END: {
        if (message.sessionId) {
          await this.sessionService.endSession(message.sessionId, {
            reason: message.payload?.reason || 'Peer requested end'
          });
        }
        if (message.targetId) {
          const target = this.peers.get(message.targetId);
          if (target) {
            target.send(message);
          }
        }
        break;
      }
    }
  }

  public getPeer(peerId: string): ConnectedPeer | undefined {
    return this.peers.get(peerId);
  }

  public getAgentPeerId(deviceId: string): string | undefined {
    return this.agentMap.get(deviceId);
  }
}
