/* eslint-disable no-debugger, no-return-assign, array-callback-return */
process.chdir(__dirname);

const fs = require('fs');
const JSON5 = require('json5');
const Papa = require('papaparse');

function stringify(obj) {
  return `export default ${JSON5.stringify(obj, null, 2)};`;
}

function loadExd(filename) {
  const data = Papa.parse(fs.readFileSync('./in/' + filename, 'utf8')).data;
  const fields = data[1];
  return data.slice(3, -1).map(line => {
    const ret = {};
    for (let i = 0; i < line.length; i++) {
      if (fields[i] in ret) console.log(fields[i]);
      ret[fields[i] || i] = line[i];
      ret[i] = line[i];
    }
    return ret;
  });
}

const versions = {
  data: '5.4',
  released: '5.31',  // released version of chinese datacenter
};

const statAbbrs = {
  1: 'STR', 2: 'DEX', 4: 'INT', 5: 'MND', 3: 'VIT',
  27: 'CRT', 22: 'DHT', 44: 'DET', 45: 'SKS', 46: 'SPS', 19: 'TEN', 6: 'PIE',
  70: 'CMS', 71: 'CRL', 11: 'CP',
  72: 'GTH', 73: 'PCP', 10: 'GP',
  12: 'PDMG', 13: 'MDMG',
};

const jobs = [
  'PLD', 'WAR', 'DRK', 'GNB',
  'WHM', 'SCH', 'AST',
  'MNK', 'DRG', 'NIN', 'SAM',
  'BRD', 'MCH', 'DNC',
  'BLM', 'SMN', 'RDM', 'BLU',
  'CRP', 'BSM', 'ARM', 'GSM', 'LTW', 'WVR', 'ALC', 'CUL',
  'MIN', 'BTN', 'FSH',
];

const patchIds = require('./in/Item.json');
const patches = {
  58: '5.0', 59: '5.01', 60: '5.05', 61: '5.08',
  62: '5.1', 63: '5.11', 65: '5.15',
  66: '5.2', 67: '5.21', 68: '5.25',
  69: '5.3', 70: '5.31', 71: '5.35',
  72: '5.4',
};

const sources = require('./in/sources');
const sourceOfId = {};
for (const [begin, end, source] of sources) {
  for (let i = begin; i <= end; i++) {
    if (i in sourceOfId) debugger;
    sourceOfId[i] = source;
  }
}

const BaseParam = loadExd('BaseParam.csv');
const ClassJobCategory = loadExd('ClassJobCategory.csv');
const ContentFinderCondition = loadExd('ContentFinderCondition.csv');
const Item = loadExd('Item.csv');
const ItemCn = loadExd('Item.cn.csv');
const ItemAction = loadExd('ItemAction.csv');
const ItemFood = loadExd('ItemFood.csv');
const ItemLevel = loadExd('ItemLevel.csv');

const jobCategories = ClassJobCategory.map(line => {
  const ret = {};
  for (const classjob of jobs) {
    if (line[classjob] === 'True') {
      ret[classjob] = true;
    }
  }
  return Object.keys(ret).length > 0 ? ret : undefined;
});

const jobCategoriesUsed = [];
const levelsUsed = {};
const sourcesMissing = {};

jobCategories[2] = { PLD: true, WAR: true, DRK: true, GNB: true, MNK: true, DRG: true, SAM: true };
const jobCategoryOfMainStats = {
  'STR': 2,
  'DEX': 105,
  'INT': 63,
  'MND': 64,
  'STR,DEX': 30,
  'INT,MND': 31,
};

const gears = Item
  .map((x, index) => {
    if (jobCategories[x['ClassJobCategory']] === undefined) return;

    const ret = {};
    ret.id = Number(x['#']);
    ret.name = ItemCn[index]?.['Name'] || x['Name'];
    ret.level = Number(x['Level{Item}']);
    ret.rarity = Number(x['Rarity']);
    ret.slot = Number(x['EquipSlotCategory']);
    ret.role = Number(x['BaseParamModifier']);
    ret.jobCategory = Number(x['ClassJobCategory']);
    ret.equipLevel = Number(x['Level{Equip}']);
    ret.materiaSlot = Number(x['MateriaSlotCount']);
    ret.materiaAdvanced = x['IsAdvancedMeldingPermitted'] === 'True' ? true : undefined;
    ret.stats = {};
    ret.hq = x['CanBeHq'] === 'True' ? true : undefined;
    ret.source = sourceOfId[x['#']];
    ret.patch = patches[patchIds[x['#']]];

    // stats
    const rawStats = {};
    for (let i = 0; i < 6; i++) {
      rawStats[x[`BaseParam[${i}]`]] = (rawStats[x[`BaseParam[${i}]`]] || 0) + Number(x[`BaseParamValue[${i}]`]);
      if (ret.hq) {  // 不能 HQ 的装备 {Special} 属性有值可能是有套装效果
        rawStats[x[`BaseParam{Special}[${i}]`]] = (rawStats[x[`BaseParam{Special}[${i}]`]] ?? 0) +
          Number(x[`BaseParamValue{Special}[${i}]`]);
      }
    }
    rawStats[12] = (rawStats[12] ?? 0) + Number(x['Damage{Phys}']);
    rawStats[13] = (rawStats[13] ?? 0) + Number(x['Damage{Mag}']);
    for (const k of Object.keys(rawStats)) {
      if (rawStats[k] > 0 && k in statAbbrs && k !== '12' && k !== '13') {
        ret.stats[statAbbrs[k]] = rawStats[k];
      }
    }
    if (rawStats[12] > 0 && ('STR' in ret.stats || 'DEX' in ret.stats)) {
      ret.stats['PDMG'] = rawStats[12];
      ret.stats['DLY'] = Number(x['Delay<ms>']);  // 攻击间隔不会有 HQ 附加值
    }
    if (rawStats[13] > 0 && ('INT' in ret.stats || 'MND' in ret.stats)) {
      ret.stats['MDMG'] = rawStats[13];
    }
    if (ret.slot === 13 && ret.jobCategory === 129) {  // 青魔武器没有属性
      ret.stats['MDMG'] = rawStats[13];
    }
    if (Object.keys(ret.stats).length === 0) return;

    // jobCategory
    if (ret.jobCategory === 1 || ret.jobCategory === 34 || ret.jobCategory === 30 || ret.jobCategory === 31) {
      const existMainStats = ['STR', 'DEX', 'INT', 'MND'].filter(x => x in ret.stats).join(',');
      if (existMainStats !== '') {
        ret.jobCategory = jobCategoryOfMainStats[existMainStats] || 34;
      } else {
        const craft = 'CMS' in ret.stats || 'CRL' in ret.stats || 'CP' in ret.stats;
        const gather = 'GTH' in ret.stats || 'PCP' in ret.stats || 'GP' in ret.stats;
        if (craft && !gather) ret.jobCategory = 33;
        if (!craft && gather) ret.jobCategory = 32;
        if (craft && gather) ret.jobCategory = 35;
        if (!craft && !gather) ret.jobCategory = 34;
      }
    }
    if (ret.jobCategory === 63 && ret.equipLevel > 60) {  // 青魔并不能装备高等级装备
      ret.jobCategory = 89;
    }

    jobCategoriesUsed[ret.jobCategory] = jobCategories[ret.jobCategory];
    levelsUsed[ret.level] = true;
    if (ret.source === undefined && ret.equipLevel >= 60) {
      sourcesMissing[ret.id] = ret.name;
    }
    return ret;
  })
  .filter(Boolean)
  .sort((a, b) => {
    const k = a.level - b.level;
    return k !== 0 ? k : a.id - b.id;
  });

const jobCategoryMap = Object.fromEntries(jobCategoriesUsed
  .map((x, i) => [Object.keys(x).sort().join(','), i]).filter(Boolean));
const foods = Item
  .map((x, index) => {
    const itemAction = ItemAction[x['ItemAction']];
    if ((itemAction['Type'] !== '844' && itemAction['Type'] !== '845') || x['CanBeHq'] !== 'True') return;
    const itemFood = ItemFood[itemAction['Data[1]']];

    const ret = {};
    ret.id = Number(x['#']);
    ret.name = ItemCn[index]?.['Name'] || x['Name'];
    ret.level = Number(x['Level{Item}']);
    ret.slot = -1;
    ret.jobCategory = undefined;
    ret.stats = {};
    ret.statRates = {};
    ret.statMain = statAbbrs[itemFood['BaseParam[0]']];
    ret.patch = patches[patchIds[x['#']]];

    // stats
    for (const i of [0, 1, 2]) {
      const stat = statAbbrs[itemFood[`BaseParam[${i}]`]];
      if (stat !== undefined) {
        if (itemFood[`IsRelative[${i}]`] === 'True') {
          ret.stats[stat] = Number(itemFood[`Max{HQ}[${i}]`]);
          ret.statRates[stat] = Number(itemFood[`Value{HQ}[${i}]`]);
        } else {
          ret.stats[stat] = Number(itemFood[`Value{HQ}[${i}]`]);
        }
      }
    }
    if (Object.keys(ret.stats).length === 0) return;

    // jobCategory
    const jobs = {};
    if ('CMS' in ret.stats || 'CRL' in ret.stats || 'CP' in ret.stats) {
      ['CRP', 'BSM', 'ARM', 'GSM', 'LTW', 'WVR', 'ALC', 'CUL'].forEach(j => jobs[j] = true);
    }
    if ('GTH' in ret.stats || 'PCP' in ret.stats || 'GP' in ret.stats) {
      ['MIN', 'BTN', 'FSH'].forEach(j => jobs[j] = true);
    }
    if ('TEN' in ret.stats) {
      ['PLD', 'WAR', 'DRK', 'GNB'].forEach(j => jobs[j] = true);
    }
    if ('PIE' in ret.stats) {
      ['WHM', 'SCH', 'AST'].forEach(j => jobs[j] = true);
    }
    if (Object.keys(jobs).length === 0) {
      if (!('SPS' in ret.stats)) {
        ['PLD', 'WAR', 'DRK', 'GNB', 'MNK', 'DRG', 'NIN', 'SAM', 'BRD', 'MCH', 'DNC'].forEach(j => jobs[j] = true);
      }
      if (!('SKS' in ret.stats)) {
        ['WHM', 'SCH', 'AST', 'BLM', 'SMN', 'RDM', 'BLU'].forEach(j => jobs[j] = true);
      }
    }
    ret.jobCategory = jobCategoryMap[Object.keys(jobs).sort().join(',')];
    if (ret.jobCategory === undefined) debugger;

    return ret;
  })
  .filter(Boolean);

const bestFoods = [];
for (const food of foods.slice().reverse()) {
  if (food.id === 4745) continue;  // 唯一的直击信仰食物，各只加1，应该并不会有人想吃它
  if (food.patch > versions.released) {
    food.best = true;
    continue;
  }
  if (!bestFoods.some(bestFood => Object.keys(food.stats).every(stat => food.stats[stat] <= bestFood.stats[stat]))) {
    food.best = true;
    bestFoods.push(food);
  }
}

const syncLevelOfJobLevel = {};
for (const x of ContentFinderCondition) {
  if (x['ClassJobLevel{Required}'] === x['ClassJobLevel{Sync}'] && Number(x['ClassJobLevel{Required}']) >= 50) {
    syncLevelOfJobLevel[x['ItemLevel{Required}']] = x['ClassJobLevel{Required}'];
    syncLevelOfJobLevel[x['ItemLevel{Sync}']] = x['ClassJobLevel{Required}'];
  }
}
delete syncLevelOfJobLevel['0'];
const syncLevels = {};
for (const l of Object.keys(syncLevelOfJobLevel).map(x => Number(x)).sort((a, b) => a - b)) {
  const jobLevel = syncLevelOfJobLevel[l];
  if (!(jobLevel in syncLevels)) {
    syncLevels[jobLevel] = [];
  }
  syncLevels[jobLevel].push(l);
  levelsUsed[l] = true;
}

const levelCaps = {
  level: Object.keys(levelsUsed).map(x => parseInt(x, 10)).sort((a, b) => a - b),
};
for (const i of Object.keys(statAbbrs)) {
  levelCaps[statAbbrs[i]] = levelCaps.level.map(l => parseInt(ItemLevel[l][i], 10));
}

const slotCaps = {};
for (const i of Object.keys(statAbbrs)) {
  slotCaps[statAbbrs[i]] = Array.from({ length: 14 }).map((_, j) => j === 0 ? 0 : parseInt(BaseParam[i][4 + j], 10));
}

const roleCaps = {};
for (const i of Object.keys(statAbbrs)) {
  roleCaps[statAbbrs[i]] = Array.from({ length: 13 }).map((_, j) => parseInt(BaseParam[i][26 + j], 10));
}

const levelGroupBasis = [1, 50, 150, 290, 430];
const levelGroupIds = [];
const levelGroupLast = levelGroupBasis[levelGroupBasis.length - 1];
let groupId = 0;
for (let level = 1; level <= levelGroupLast + 200; level++) {
  if (levelGroupBasis.includes(level)){
    groupId = level;
  }
  levelGroupIds[level] = groupId;
}
const gearGroups = [];
const groupedGears = [];
for (const gear of gears) {
  let groupId = levelGroupIds[gear.level];
  if ((gear.id >= 10337 && gear.id <= 10344) || gear.id === 17726) {  // 专家证、渔叉跟随最新分组加载
    groupId = levelGroupLast;
  }
  gearGroups[gear.id] = groupId;
  if (groupedGears[groupId] === undefined) groupedGears[groupId] = [];
  groupedGears[groupId].push(gear);
}

const oretoolsData = require('./in/oretools-data-en.json');
const nameToLodestoneId = {};
for (const group of Object.values(oretoolsData.data)) {
  for (const item of group) {
    if (item.name in nameToLodestoneId) debugger;
    nameToLodestoneId[item.name] = item.id;
  }
}
const lodestoneIds = [];
for (const item of Item) {
  const name = item['Name'];
  if (name in nameToLodestoneId) {
    lodestoneIds[Number(item['#'])] = nameToLodestoneId[name];
  }
}

const sourcesMissingIds = Object.keys(sourcesMissing).map(x => Number(x)).sort((a, b) => a - b);
if (sourcesMissingIds.length > 0) {
  const output = [];
  sourcesMissingIds.forEach((x, i) => {
    output.push(`${x}\t${sourcesMissing[x]}`);
    if (x + 1 !== sourcesMissingIds[i + 1]) output.push('-----');
  });
  fs.writeFileSync('./out/sourcesMissing.txt', output.join('\n'));
} else {
  fs.unlink('./out/sourcesMissing.txt', () => {});  // ignore error
}

fs.writeFileSync('./out/versions.ts', stringify(versions).replace(/null,/g, ','));
fs.writeFileSync('./out/gearGroupBasis.js', stringify(levelGroupBasis).replace(/null,/g, ','));
fs.writeFileSync('./out/gearGroups.js', stringify(gearGroups).replace(/null,/g, ','));
for (const groupId of levelGroupBasis) {
  fs.writeFileSync(`./out/gears-${groupId}.js`, stringify(groupedGears[groupId]));
}
fs.writeFileSync('./out/gears-food.js', stringify(foods));
fs.writeFileSync('./out/jobCategories.js', stringify(jobCategoriesUsed).replace(/null,/g, ','));
fs.writeFileSync('./out/levelCaps.js', stringify(levelCaps));
fs.writeFileSync('./out/slotCaps.js', stringify(slotCaps));
fs.writeFileSync('./out/roleCaps.js', stringify(roleCaps));
fs.writeFileSync('./out/syncLevels.js', stringify(syncLevels).replace(/'/g, ''));
fs.writeFileSync('./out/lodestoneIds.js', stringify(lodestoneIds).replace(/null,/g, ','));
