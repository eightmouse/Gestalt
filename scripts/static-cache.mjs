export function updateStaticCacheTokens(html, token) {
  return html.replace(
    /\b(href|src)=(["'])((?:app\/(?:globals|desktop-navigation)\.css|public\/data\/records\.js|public\/note-inline\.js|public\/image-framing\.js|public\/seasonal\.js|public\/desktop-navigation\.js|public\/os-behaviour\.js|public\/x-terminal\.js|static-app\.js)(?:[?#][^"']*)?)\2/g,
    (_, attribute, quote, asset) => {
      const url = new URL(asset, "https://gestalt.invalid/");
      url.searchParams.set("v", String(token));
      return `${attribute}=${quote}${url.pathname.slice(1)}${url.search}${url.hash}${quote}`;
    }
  );
}
