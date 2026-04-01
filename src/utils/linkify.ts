export function linkify(text: string): string {
  return text.replace(
    /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g,
    '<a href="mailto:$1" class="text-primary underline">$1</a>'
  );
}