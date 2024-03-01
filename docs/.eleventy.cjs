/* eslint-disable array-bracket-spacing */

const eleventy = require('@panoply/11ty');
const papyrus = require('papyrus');
const container = require('markdown-it-container');
const { terser, sprite, versions, markdown } = require('@sissel/11ty');
const flems = require('./src/data/flems.json');

/**
 * Papyrus Syntax
 *
 * Highlighting code blocks of markdown annotated regions of input.
 */
function syntax ({ raw, language }) {

  if (language === 'bash') {

    return papyrus.static(raw, {
      language,
      editor: false,
      showSpace: false,
      showTab: false,
      showCR: false,
      showLF: false,
      showCRLF: false,
      lineNumbers: false
    })

  } else if (language === 'treeview') {

    return papyrus.static(raw, {
      language,
      editor: false,
      showSpace: false,
      trimEnd: false,
      trimStart: false
    });

  }

  return papyrus.static(raw, {
    language,
    editor: false,
    showSpace: false,
    trimEnd: true,
    trimStart: true
  });

};


function tabs(md, tokens, idx) {

  if(tokens[idx].nesting === 1) {

    const col = tokens[idx].info.trim().match(/^tabs\s+(.*)$/);

    if (col !== null) {

      const [ type, id ] = col[1].split(':')

      // opening tag
      return type === 'example' ? [
        /* html */`
        <div spx-component="tabs">
          <div class="row gx-0 bd tabs py-2 px-2">
            <div class="col-auto mr-2">
              <button
                type="button"
                class="btn upcase tab active"
                aria-label="Preview Example"
                data-tooltip="top"
                spx-node="tabs.button"
                spx@click="tabs.toggle"
                spx-tabs:index="0">
                DEMO
              </button>
            </div>
            <div class="col-auto">
              <button
                type="button"
                class="btn upcase tab"
                aria-label="Markup Structure"
                data-tooltip="top"
                spx-node="tabs.button"
                spx@click="tabs.toggle"
                spx-tabs:index="1">
                HTML
              </button>
            </div>
            <div class="col-auto ml-auto">
              <a
                class="btn upcase tab"
                href="${flems[id]}"
                target="_blank"
                aria-label="Open in flems playground"
                data-tooltip="top">
                FLEMS
                <svg class="icon icon-right" role="group">
                  <use xlink:href="#svg-flems"></use>
                </svg>
              </a>
            </div>
          </div>
          <div class="col-12 tab-content p-4" spx-node="tabs.tab">
        `,
      ].join('') : type ==='markup' ? [
        /* html */`
        <div spx-component="tabs">
          <div class="row gx-0 bd tabs py-2 px-2">
            <div class="col-auto mr-2">
              <button
                type="button"
                class="btn upcase tab active"
                spx-node="tabs.button"
                spx@click="tabs.toggle"
                spx-tabs:index="0">
                SEMANTIC
              </button>
            </div>
            <div class="col-auto">
              <button
                type="button"
                class="btn upcase tab"
                spx-node="tabs.button"
                spx@click="tabs.toggle"
                spx-tabs:index="1">
                SIBLING
              </button>
            </div>
          </div>
          <div class="col-12 tab-content" spx-node="tabs.tab">
        `,
      ].join('') : [
        /* html */`
          <div class="col-12 tab-content d-none" spx-node="tabs.tab">
        `
      ].join('')
    }
   }



  return '</div>'


}


module.exports = eleventy (function(config){


  markdown(config, {
    syntax,
    options: {
      html: true,
      linkify: true,
      typographer: true,
      breaks: false,
    }
   })
  .use(container, 'tabs', { render: (tokens, idx) => tabs(markdown, tokens, idx) })
  .disable("code");


  config.addPlugin(versions, { version: require('../package.json').version });
  config.addPlugin(sprite, { inputPath: './src/svg', spriteShortCode: 'sprite' });
  config.addPlugin(terser)
  config.setDynamicPermalinks(false);


  return {
    htmlTemplateEngine: 'liquid',
    passthroughFileCopy: false,
    pathPrefix: '/relapse',
    templateFormats: ['liquid', 'json', 'md', 'css', 'html', 'yaml'],
    dir: {
      input: 'src',
      output: 'public',
      includes: 'views/include',
      layouts: 'views/layout',
      data: 'data'
    }
  };

});
