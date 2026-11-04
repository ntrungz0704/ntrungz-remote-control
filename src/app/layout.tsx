import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PetSocial — Mạng Xã Hội Thú Cưng & Chủ Nuôi',
  description: 'Chia sẻ khoảnh khắc vui vẻ, đáng yêu của các bé cún, mèo và thú cưng cùng cộng đồng yêu động vật.',
  openGraph: {
    title: 'PetSocial — Mạng Xã Hội Thú Cưng',
    description: 'Chia sẻ ảnh và video ngắn cùng các bé cưng 🐾',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var clean = function() {
                    var els = document.querySelectorAll('[bis_skin_checked]');
                    for (var i = 0; i < els.length; i++) {
                      els[i].removeAttribute('bis_skin_checked');
                    }
                  };
                  var observer = new MutationObserver(function(mutations) {
                    for (var i = 0; i < mutations.length; i++) {
                      var m = mutations[i];
                      if (m.type === 'attributes' && m.attributeName === 'bis_skin_checked') {
                        m.target.removeAttribute('bis_skin_checked');
                      }
                      if (m.addedNodes && m.addedNodes.length > 0) {
                        clean();
                      }
                    }
                  });
                  observer.observe(document.documentElement, {
                    attributes: true,
                    attributeFilter: ['bis_skin_checked'],
                    childList: true,
                    subtree: true,
                  });
                  window.addEventListener('DOMContentLoaded', clean);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className="min-h-screen bg-[#fffbf7] text-zinc-900 antialiased selection:bg-rose-200 selection:text-rose-900"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
