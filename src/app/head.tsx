import Script from 'next/script';

export default function Head() {
  return (
    <>
      <Script
        id="theme-script"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            try {
              var t = localStorage.getItem('pustara_theme');
              if (t === 'light') document.documentElement.classList.add('light');
            } catch(e) {}
          `,
        }}
      />
    </>
  );
}
