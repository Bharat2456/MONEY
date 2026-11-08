/*! MONEY publishable-key helper — sandbox only. Uses ONLY the publishable key (money_test_pk_…); never put a secret key in the browser. */
(function () {
  var script = document.currentScript;
  var base = script && script.src ? new URL(script.src).origin : '';
  window.MONEY = {
    /** Looks up an order your server already created and redirects the customer to the hosted checkout. */
    checkout: function (opts) {
      if (!opts || !opts.key || !opts.orderId) return Promise.reject(new Error('MONEY.checkout needs { key, orderId }'));
      if (String(opts.key).indexOf('money_test_sk_') === 0) return Promise.reject(new Error('Never use a secret key in the browser.'));
      return fetch(base + '/api/v1/public/orders/' + encodeURIComponent(opts.orderId) + '?key=' + encodeURIComponent(opts.key))
        .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error((j.error && j.error.message) || 'Lookup failed'); return j; }); })
        .then(function (o) {
          if (new URL(o.checkout_url).origin !== base) throw new Error('Unexpected checkout origin');
          window.location.assign(o.checkout_url);
        });
    },
  };
})();
