export function updateStaticCacheTokens(html, token) {
  return html.replace(
    /\b(href|src)=(["'])((?:app\/globals\.css|public\/data\/records\.js|static-app\.js)(?:[?#][^"']*)?)\2/g,
    (_, attribute, quote, asset) => {
      const url = new URL(asset, "https://gestalt.invalid/");
      url.searchParams.set("v", String(token));
      return `${attribute}=${quote}${url.pathname.slice(1)}${url.search}${url.hash}${quote}`;
    }
  );
}
