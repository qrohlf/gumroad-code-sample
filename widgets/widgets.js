/* global _ */

// Note - some of this code is adapted from my open source project over at
// https://github.com/qrohlf/gifhub.
//
// Note that for the sake of the demo I'm loading lodash.throttle from unpkg,
// but in production I'd probably be using a tree-shaking bundler like parcel
// or something that could grab only what I need, minify it, and inline this
// dependency.
//
// I've skipped animations and loading spinners for the sake of time here, but
// if you want to see some examples of my work on animations, nice button
// transitions, etc, I'd be happy to demo one of my side projects for you, or
// just have a peek at https://scoutmaps.io/styleguide

// custom domain support - we'll grab this from the <script> element, if present.
const customDomain = document.currentScript.dataset.customDomain
const supportedUrlPattern = customDomain
  ? new RegExp(`(gumroad\\.com|gum\\.co|${_.escapeRegExp(customDomain)})$`, 'i')
  : /(gumroad\.com|gum\.co)$/i

const createWithAttrs = (tag, attrs = {}) => {
  const node = document.createElement(tag)
  _.each(attrs, (value, key) => node.setAttribute(key, value))
  return node
}

const injectStyles = () => {
  const style = createWithAttrs('style', { type: 'text/css' })
  style.innerHTML = `
    body.gumroad-modal-open {
      height: 100vh;
      overflow-y: hidden;
    }

    #gumroad-overlay-container {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      background: rgba(0, 0, 0, 0.5);
      text-align: center;
    }
    .gumroad-iframe {
      width: 80vw;
      height: calc(100vh - 80px);
      max-width: 800px;
      margin: 40px 0;
      border-radius: 16px;
      overflow: hidden;
    }

    .gumroad-embedded-iframe {
      width: 100%;
      height: 890px;
    }

    @media screen and (max-width: 500px) {
      /* TODO - we need a close button if we're going fullscreen in mobile mode */
      .gumroad-iframe {
        width: 100%;
        height: 100%;
      }
    }
  `
  document.head.appendChild(style)
}

const lazyLoadOverlayContainer = () => {
  const existing = document.getElementById('gumroad-overlay-container')
  if (existing) {
    return existing
  }
  const container = createWithAttrs('div', { id: 'gumroad-overlay-container' })
  container.addEventListener('click', dismissOverlay)
  document.body.appendChild(container)
  return container
}

const dismissOverlay = () => {
  const overlayContainer = lazyLoadOverlayContainer()
  overlayContainer.style.display = 'none'
  document.body.classList.remove('gumroad-modal-open')
}

const preloadIframe = (iframe) => {
  const overlayContainer = lazyLoadOverlayContainer()
  overlayContainer.style.display = 'none'
  overlayContainer.innerHTML = ''
  overlayContainer.appendChild(iframe)
}

const showOverlay = (iframe) => {
  const overlayContainer = lazyLoadOverlayContainer()
  // if the iframe wasn't preloaded, then go ahead and get it in the DOM now
  if (
    overlayContainer.firstChild !== iframe ||
    overlayContainer.children.length !== 1
  ) {
    overlayContainer.innerHTML = ''
    overlayContainer.appendChild(iframe)
  }
  document.body.classList.add('gumroad-modal-open')
  overlayContainer.style.display = 'block'
}

const getHost = (href) => new URL(href).hostname

const processOverlayTrigger = (anchor) => {
  // use a closure to handle the iframe state for this thing
  const iframe = createWithAttrs('iframe', {
    src: anchor.href,
    scrolling: 'yes',
    allowfullscreen: 'allowfullscreen',
    class: 'gumroad-iframe',
    frameborder: 0,
  })
  // a note on iframe.src:
  // You folks are using a slick custom thing over at the
  // https://gumroad.com/overlay_page?single_product_mode=true&all_permalinks=<product>
  // which implements a message-passing API to allow communication between
  // the iframe and the host.
  //
  // I'm going to call reverse engineering this API out of scope for this
  // particular challenge and just slam the link href right in here ;)
  //
  // Unfortunately, this means that the same-origin policy will prevent
  // me from reading the iframe content height, so it'll have to scroll
  // internally as a result.

  anchor.addEventListener('mouseover', () => {
    preloadIframe(iframe)
  })

  anchor.addEventListener('click', (e) => {
    e.preventDefault() // prevent navigation
    showOverlay(iframe)
  })
}

const processEmbed = (anchor) => {
  const iframe = createWithAttrs('iframe', {
    src: anchor.href,
    scrolling: 'yes',
    allowfullscreen: 'allowfullscreen',
    class: 'gumroad-embedded-iframe',
    frameborder: 0,
  })
  anchor.replaceWith(iframe)
}

const processPage = () => {
  // grab all links and turn them into a proper array instead of a NodeList,
  // filter them to links with an `href` that points to the *.gumroad.com
  // domain
  const gumLinks = Array.prototype.slice
    .call(document.querySelectorAll('a:not([data-gum-processed="true"])'))
    .filter(
      (a) =>
        a.href && a.href !== '' && getHost(a.href).match(supportedUrlPattern),
    )

  gumLinks.forEach((anchor) => {
    anchor.dataset.gumroadEmbed ||
    anchor.parentElement.classList.contains('gumroad-product-embed')
      ? processEmbed(anchor)
      : processOverlayTrigger(anchor)
    anchor.dataset.gumProcessed = true
  })

  console.log(gumLinks.length, 'links processed')
}

const init = () => {
  // Use a MutationObserver to make sure that our extra functionality gets
  // added to content that's presented async after page load, (via ajax, a
  // framework like React, or similar.)
  //
  // The throttle prevents recursion between the MutationObserver and
  // mutations created by processPage as well as ensuring page responsiveness
  // in situations where the host page is doing a LOT of rapid dom mutations
  const observer = new MutationObserver(_.throttle(processPage, 400))
  observer.observe(document, { childList: true, subtree: true })
  injectStyles()
  processPage()
}

if (document.readyState !== 'loading') {
  init()
} else {
  document.addEventListener('DOMContentLoaded', init)
}
