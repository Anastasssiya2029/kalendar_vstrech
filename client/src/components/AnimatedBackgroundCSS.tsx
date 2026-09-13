export function AnimatedBackgroundCSS() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{
        background: `
          radial-gradient(39rem 28rem at 104% -8%, rgba(176, 89, 144, 0.13), transparent 66%),
          radial-gradient(34rem 23rem at -8% 84%, rgba(231, 165, 46, 0.13), transparent 69%),
          radial-gradient(25rem 18rem at 48% 108%, rgba(124, 76, 151, 0.055), transparent 70%),
          linear-gradient(145deg, #fbf7ef 0%, #fffaf5 48%, #faf5ee 100%)
        `,
      }}
    />
  );
}
