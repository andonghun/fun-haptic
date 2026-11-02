// Melee: a rack of moves (sword, hammer, cleave, spear, combo…) performed on the straw target.
// □ or R2 performs it — R2 pushes back like a heavy weapon until it gives. Every scripted hit becomes a hit in your
// hands: a swish sweeping across the palms on the wind-up, then a crack and a thud whose weight follows the freeze.
import { effects, FLOOR, hud } from './common.js';
import { ActHaptic } from '../px.js';
import { IN } from '../input.js';
import { DS, TRG } from '../ds.js';
import { Light } from '../feel.js';
import { UI } from '../ui.js';
import { t } from '../i18n.js';

const MOVES = ['melee/sword-slash', 'melee/double-slash', 'melee/heavy-cleave', 'melee/hammer-smash', 'melee/spin-slash', 'melee/thrust', 'melee/uppercut', 'melee/spear-sweep', 'melee/scythe-reap', 'melee/dagger-flurry', 'moves/sword-combo', 'moves/dash-strike', 'moves/ground-pound', 'moves/earth-stomp']
  .filter(id => effects[id] && effects[id].act);
const HEAVY = {'melee/heavy-cleave':1.3, 'melee/hammer-smash':1.4, 'moves/ground-pound':1.5, 'moves/earth-stomp':1.4};

export function makeMelee(stage){
  let i = 0, act = null, ah = null, armed = true;
  const name = id => id.split('/')[1].replace(/-/g, ' ');
  const play = () => { if(act) stage.remove(act); const id = MOVES[i], mod = effects[id], b = mod.meta;
    act = stage.act(mod, {x:70, y:FLOOR, manual:true}); ah = new ActHaptic(mod, {pan:0.6, heavy:HEAVY[id] || 1}); };
  return {
    id:'melee',
    enter(){ stage.setBg('ground', FLOOR); stage.clear(); stage.auto.enabled = false; play(); DS.out.trigL = TRG.off(); DS.out.trigR = TRG.feedback(4, 6); Light.base = [255, 140, 90]; UI.toast(t('x_melee_tip'), 4200); },
    exit(){ stage.clear(); DS.out.trigR = TRG.off(); },
    update(dt, live){
      if(live){
        if(IN.r2 < 0.3) armed = true;
        if(IN.pressed('attack') || (armed && IN.r2 > 0.7)){ armed = false; play(); }
        if(IN.pressed('wnext') || IN.pressed('right')){ i = (i + 1) % MOVES.length; play(); }
        if(IN.pressed('wprev') || IN.pressed('left')){ i = (i - 1 + MOVES.length) % MOVES.length; play(); }
      }
      act.update(dt); ah.tick(act);
      hud(t('x_melee'), `${i + 1} / ${MOVES.length} · ${name(MOVES[i])}`, '', `${UI.key('attack')} / <span class="key">R2</span> ${t('x_perform')} · <span class="key">◀▶</span> ${t('x_choose')} · ${UI.key('pause')} ${t('menu')}`);
    }
  };
}
