'use strict';

import { findElm, findPrimaryAddressInput, findValue } from './form-detection.js';
import { LobAddressElements } from './lob-address-elements.js';


const resolveStrictness = (cfg, form) => {
  const values = ['false', 'strict', 'normal', 'relaxed', 'passthrough'];
  if (cfg && values.indexOf(cfg) > -1) {
    return cfg;
  } else {
    const attr = findValue('verify', form);
    return attr && values.indexOf(attr) > -1 ? attr : 'normal';
  }
}

/**
 * Determine the presence of address-related fields and settings
 */
export const getFormStates = cfg => {
  //everything pivots around the primary address field
  const primaries = findPrimaryAddressInput();
  const responses = [];
  primaries.each((idx, primary) => {
    primary = $(primary);
    const form = primary.closest("form");
    const strictness = resolveStrictness(cfg ? cfg.strictness : null, form);
    const create_message = findValue('verify-message', form) === 'true' || (form.length && !findElm('verify-message', form).length);
    const autocomplete = primary.length && findValue('primary', form) !== 'false';
    const verify = strictness !== 'false' && form.length && (strictness === 'passthrough' || findElm('verify-message', form).length || create_message);
    responses.push({
      primary,
      form,
      autocomplete: autocomplete,
      verify: verify,
      enrich: verify || autocomplete,
      create_message: create_message,
      strictness: strictness
    });
  });

  return responses;
}

(function () {
  /**
   * Enriches a standard HTML form by adding two address-related behaviors to the form:
   * 1) US Address autocompletion
   * 2) US Address verification
   * @compatible    - IE11+, Edge, Webkit/Safari, Chrome, Firefox
   * @dependencies  - jQuery, Algolia jQuery Plugin
   * @param {object} $ - jQuery
   * @param {object} cfg - user configuration passed as a JSON file (optional)
   * @returns {object}
   */
  const enrichWebPage = ($, cfg) => {

    const updateFormState = newState => {
      const { enrich, form } = newState;
      const state = form && form.attr("data-lob-state") || 'untouched';
      if (state === 'untouched' && enrich) {
        form.attr("data-lob-state", 'enriched');
        setTimeout(() => new LobAddressElements($, cfg, newState), 0);
      } else if (state === 'enriched' && !enrich) {
        form.attr("data-lob-state", 'untouched');
      }
    };

    /**
     * Observe the DOM. Trigger enrichment when state changes to 'enrich'
     */
    const observeDOM = state => {
      const didChange = () => {
        const newStates = getFormStates(cfg);
        newStates.forEach(updateFormState);
      }
      const MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
      if (MutationObserver) {
        const observer = new MutationObserver(didChange);
        observer.observe(window.document.body, {
          subtree: true,
          attributes: true,
          childList: true
        });
      }
    }

    //watch for DOM changes
    observeDOM();

    if(getFormStates().length) {
      console.log('init lae');
      return new LobAddressElements($, cfg);
    } else {
      return {
        do: {
          init: () => new LobAddressElements($, cfg),
        }
      };
    }
  }

  /**
   * CDN URLs for required dependencies
   */
  const paths = {
    jquery: 'https://cdnjs.cloudflare.com/ajax/libs/jquery/2.1.1/jquery.min.js',
    jquery_ac: 'https://cdnjs.cloudflare.com/ajax/libs/autocomplete.js/0.37.0/autocomplete.jquery.min.js',
  }

  /**
   * Dependency Loader
   */
  const BootStrapper = {
    load: function () {
      const args = Array.prototype.slice.call(arguments[0]);
      const next = BootStrapper[args.shift()];
      next && next.apply(this, args);
    },
    jquery: function () {
      if (!window.jQuery) {
        const args = arguments;
        const jq = document.createElement('script');
        jq.onload = function () {
          BootStrapper.load(args);
        };
        jq.src = paths.jquery;
        document.getElementsByTagName('body')[0].appendChild(jq);
      } else {
        BootStrapper.load(arguments);
      }
    },
    jquery_autocomplete: function () {
      if (!window.jQuery.fn.autocomplete) {
        const jqac = document.createElement('script');
        const args = arguments;
        jqac.onload = function () {
          BootStrapper.load(args);
        };
        jqac.src = paths.jquery_ac;
        document.getElementsByTagName('body')[0].appendChild(jqac);
      } else {
        BootStrapper.load(arguments);
      }
    },
    address_elements: function () {
      if (!window.LobAddressElements) {
        const config = window.LobAddressElementsConfig || {};
        window.LobAddressElements = enrichWebPage(window.jQuery, config);
        BootStrapper.load(arguments);
      } else {
        BootStrapper.load(arguments);
      }
    }
  }
  BootStrapper.load(['jquery', 'jquery_autocomplete', 'address_elements']);
})();
