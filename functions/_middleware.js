// storybook.readhebrewnews.com moved to storybook.learnhebrewfromzero.com (2026-10).
// Anyone arriving on the old address (old links, bookmarks, shared posts) is sent to the same page on the new one.
export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.hostname === 'storybook.readhebrewnews.com') {
    return Response.redirect('https://storybook.learnhebrewfromzero.com' + url.pathname + url.search, 301);
  }
  return context.next();
}
