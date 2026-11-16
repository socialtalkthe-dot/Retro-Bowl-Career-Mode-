window.PokiSDK = {
  init: function() { return Promise.resolve(); },
  gameLoadingStart: function() {},
  gameLoadingFinished: function() {},
  gameplayStart: function() {},
  gameplayStop: function() {},
  commercialBreak: function() { return Promise.resolve(); },
  rewardedBreak: function() { return Promise.resolve(true); },
  happyTime: function() {},
  setDebug: function() {}
};

function poki_init_raw() { return 1; }
function poki_commercial_break_raw(cb) {
  if (typeof cb === 'function') setTimeout(function() { try { cb(); } catch(e) {} }, 10);
  return 0;
}
function poki_rewarded_break_raw(cb) {
  if (typeof cb === 'function') setTimeout(function() { try { cb(true); } catch(e) {} }, 10);
  return 1;
}
function poki_script_closure_raw(inst, other, script, custom) {
  return function() {
    if (typeof gml_Script_gmcallback_poki_closure === 'function') {
      try { gml_Script_gmcallback_poki_closure(inst, other, script, custom, 1); } catch(e) {}
    }
  };
}
function poki_get_team_raw() { return ""; }
function poki_set_team_raw(t) { return 0; }
function poki_gameplay(state) {}
function poki_gameplay_start() {}
function poki_gameplay_stop() {}
function poki_happy_time(intensity) {}
function poki_is_mobile() { return 0; }
function poki_loadbar(ctx, width, height, total, current, image) {}
function poki_scaling() {}
