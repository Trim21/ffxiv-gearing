import * as mobxReact from 'mobx-react-lite';
import * as classNames from 'classnames';
import { Button } from '@rmwc/button';
import * as G from '../game';
import { useStore } from './components/contexts';
import { GearRow } from './GearRow';

export const Slot = mobxReact.observer<{ slot: G.SlotSchema }>(({ slot }) => {
  const store = useStore();
  const groupedGears = store.groupedGears[slot.slot];
  return store.filterFocus === 'comparable' && !(groupedGears?.length > 1) ? null : (
    <table className="gears_slot table card">
      <thead>
      <tr>
        <th className="gears_left">
          {slot.name}
          {slot.slot === -1 && (
            <Button
              className="gears_toogle-all-foods"
              children={store.showAllFoods ? '显示最优' :'显示全部'}
              onClick={store.toggleShowAllFoods}
            />
          )}
        </th>
        <th className="gears_materias">{slot.slot === -1 ? '利用率' : '魔晶石'}</th>
        {store.schema.stats.map(stat => (
          <th key={stat} className={classNames('gears_stat', store.schema.skeletonGears && '-skeleton')}>
            {G.statNames[stat]}
          </th>
        ))}
      </tr>
      </thead>
      <tbody>
      {groupedGears !== undefined ? groupedGears.map(gear => (
        <GearRow key={gear.id} gear={gear} />
      )) : (
        <GearRow gear={undefined} />
      )}
      </tbody>
    </table>
  );
});
