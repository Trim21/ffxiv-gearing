import * as mobx from 'mobx';
import * as G from '../game';

export const gearData = mobx.observable.map<G.GearId, G.GearBase>({}, { deep: false });
mobx.runInAction(() => {
  for (const item of require('../../data/out/foods').default as G.GearBase[]) {
    gearData.set(item.id, item);
  }
  for (const item of require('../../data/out/gears-recent').default as G.GearBase[]) {
    gearData.set(item.id, item);
  }
});

const gearDataLoadStatus = mobx.observable.map<string | number, 'loading' | 'finished'>({});  // TODO: handle failures
export const gearDataLoading = mobx.computed(() => {
  for (const status of gearDataLoadStatus.values()) {
    if (status === 'loading') return true;
  }
  return false;
});

export const loadGearData = async (groupId: string | number) => {
  if (groupId === undefined || gearDataLoadStatus.has(groupId)) return;
  mobx.runInAction(() => gearDataLoadStatus.set(groupId, 'loading'));
  const data = (await import(/* webpackChunkName: "[request]" */`../../data/out/gears-${groupId}`))
    .default as G.GearBase[];
  console.debug(`Load gears-${groupId}.`);
  mobx.runInAction(() => {
    for (const item of data) {
      if (!gearData.has(item.id)) {
        gearData.set(item.id, item);
      }
    }
    gearDataLoadStatus.set(groupId, 'finished');
  });
};

const gearGroups = require('../../data/out/gearGroups').default as number[];
export const loadGearDataOfGearId = (gearId: G.GearId) => loadGearData(gearGroups[gearId]);

const gearGroupBasis = require('../../data/out/gearGroupBasis').default as number[];
export const loadGearDataOfLevelRange = (minLevel: number, maxLevel: number) => {
  let i = 0;
  while (gearGroupBasis[i + 1] <= minLevel) i++;
  while (gearGroupBasis[i] <= maxLevel) {
    loadGearData(gearGroupBasis[i]);
    i++;
  }
};
gearDataLoadStatus.set(gearGroupBasis[gearGroupBasis.length - 1], 'finished');

export const gearDataOrdered = mobx.observable.box([] as G.GearBase[], { deep: false });
mobx.autorun(() => {
  if (!gearDataLoading.get()) {
    mobx.runInAction(() => {
      gearDataOrdered.set(Array.from(gearData.values()).sort((a, b) => {
        const k = a.level - b.level;
        return k !== 0 ? k : a.id - b.id;
      }));
    });
  }
});
