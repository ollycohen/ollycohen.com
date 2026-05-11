// ==========================================
// IMAGE HELPER — ollycohen.com
// ==========================================
// Builds responsive srcset URLs for images hosted on Cloudinary.
// Cloudinary URLs get f_auto,q_auto:best,w_<n> transforms injected after /upload/.
// Non-Cloudinary URLs (e.g. legacy /images/... paths) pass through unchanged
// so the site keeps working during migration.

(function () {
  var WIDTHS = [480, 768, 1200, 1920, 2880];
  var CLOUDINARY_RE = /\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//;

  function isCloudinary(url) {
    return typeof url === 'string' && CLOUDINARY_RE.test(url);
  }

  function transform(url, width) {
    return url.replace('/upload/', '/upload/f_auto,q_auto:best,w_' + width + '/');
  }

  function buildSrcset(url) {
    if (!isCloudinary(url)) return '';
    return WIDTHS.map(function (w) { return transform(url, w) + ' ' + w + 'w'; }).join(', ');
  }

  function imgUrl(url, width) {
    if (!isCloudinary(url)) return url || '';
    return transform(url, width || 1920);
  }

  function escAttr(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  // Build a responsive <img> string. opts: { url, alt, className, sizes, loading }
  function imgTag(opts) {
    if (!opts || !opts.url) return '';
    var srcset = buildSrcset(opts.url);
    var src = imgUrl(opts.url, 1920);
    var attrs = ['src="' + escAttr(src) + '"'];
    if (srcset) attrs.push('srcset="' + escAttr(srcset) + '"');
    attrs.push('sizes="' + escAttr(opts.sizes || '100vw') + '"');
    attrs.push('loading="' + escAttr(opts.loading || 'lazy') + '"');
    attrs.push('decoding="async"');
    attrs.push('alt="' + escAttr(opts.alt || '') + '"');
    if (opts.className) attrs.push('class="' + escAttr(opts.className) + '"');
    return '<img ' + attrs.join(' ') + '>';
  }

  // Apply responsive attrs to an existing <img> element.
  function applyResponsive(img, url, sizes) {
    if (!img || !url) return;
    if (isCloudinary(url)) {
      img.srcset = buildSrcset(url);
      img.sizes = sizes || '100vw';
      img.src = imgUrl(url, 1920);
    } else {
      img.src = url;
    }
    if (!img.loading) img.loading = 'lazy';
    img.decoding = 'async';
  }

  window.imgUrl = imgUrl;
  window.buildSrcset = buildSrcset;
  window.imgTag = imgTag;
  window.applyResponsive = applyResponsive;
})();
