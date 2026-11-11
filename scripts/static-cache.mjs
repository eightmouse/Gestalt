export function updateStaticCacheTokens(html, token) {
  return html.replace(
    /\b(href|src)=(["'])((?:app\/(?:globals|desktop-navigation|appearance|memory-state|pocket-index)\.css|public\/(?:memory-state|appearance|ambient-motion|note-inline|image-framing|seasonal|desktop-navigation|os-behaviour|workspace-tools|record-motion|pocket-index)\.js|public\/data\/records\.js|static-app\.js)(?:[?#][^"']*)?)\2/g,
    (_, attribute, quote, asset) => {
      const url = new URL(asset, "https://gestalt.invalid/");
      url.searchParams.set("v", String(token));
      return `${attribute}=${quote}${url.pathname.slice(1)}${url.search}${url.hash}${quote}`;
    }
  );
}
