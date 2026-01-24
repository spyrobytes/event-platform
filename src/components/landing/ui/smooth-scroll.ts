const HEADER_OFFSET = 100; // Account for fixed header height + padding

export function smoothScrollTo(targetId: string) {
  const element = document.getElementById(targetId);
  if (!element) return;

  const elementPosition = element.getBoundingClientRect().top + window.scrollY;
  const offsetPosition = elementPosition - HEADER_OFFSET;

  window.scrollTo({
    top: offsetPosition,
    behavior: "smooth",
  });
}

export function handleAnchorClick(
  e: React.MouseEvent<HTMLAnchorElement>,
  href: string,
  onComplete?: () => void
) {
  if (href.startsWith("#")) {
    e.preventDefault();
    smoothScrollTo(href.slice(1));
    onComplete?.();
  }
}
