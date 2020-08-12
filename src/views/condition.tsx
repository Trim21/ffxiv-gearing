import * as React from 'react';
import { observer } from 'mobx-react-lite';
import { Ripple } from '@rmwc/ripple';
import { Button } from '@rmwc/button';
import { TextField } from '@rmwc/textfield';
import { Radio } from '@rmwc/radio';
import Clipboard from 'react-clipboard.js';
import * as G from '../game';
import { useStore } from './components/contexts';
import { Icon } from './components/Icon';
import { Dropdown } from './components/Dropdown';
import { JobSelector } from './job-selector';

export const Condition = observer(() => {
  const store = useStore();
  type ExpandedPanel = 'job' | 'materia' | null;  // FIXME
  const [ expandedPanel, setExpandedPanel ] = React.useState<ExpandedPanel>(null);
  const toggleExpandedPanel = (panel: ExpandedPanel) => setExpandedPanel(v => v === panel ? null : panel);
  const welcoming = store.job === undefined;
  const editing = !store.isViewing && store.job !== undefined;
  const viewing = store.isViewing && store.job !== undefined;
  return (
    <div className="condition card" style={store.job === undefined ? { width: '900px' } : {}}>
      {welcoming && (
        <span className="condition_job -empty">选择一个职业开始配装</span>
      )}
      {(editing || viewing) && (
        <Ripple>
          <span className="condition_job" onClick={editing ? () => toggleExpandedPanel('job') : undefined}>
            <Icon className="condition_job-icon" name={'jobs/' + store.job} />
            <span className="condition_job-name">{store.schema.name}</span>
          </span>
        </Ripple>
      )}
      {editing && <span className="condition_divider" />}
      {editing && (
        <span className="condition_level">
          <span className="condition_level-value">
            <ConditionLevelInput
              value={store.minLevel}
              onChange={value => store.setMinLevel(value)}
            />
            <span className="condition_level-separator">-</span>
            <ConditionLevelInput
              value={store.maxLevel}
              onChange={value => store.setMaxLevel(value)}
            />
          </span>
          品级
        </span>
      )}
      {/*{(editing | viewing) && <span className="condition_divider" />}*/}
      {/*{(editing | viewing) && (*/}
      {/*  <Button className="condition_button">魔晶石</Button>*/}
      {/*)}*/}
      <span className="condition_right">
        {editing && (
          <Dropdown
            label={({ ref, toggle }) => (
              <Button ref={ref} className="condition_button" onClick={toggle}>分享</Button>
            )}
            popper={() => (
              <div className="share card">
                <a className="share_url" href={store.shareUrl} target="_blank">{store.shareUrl}</a>
                <div className="share_tip">分享时只会包含选中的装备。</div>
                <Clipboard
                  className="share_copy"
                  component="span"
                  data-clipboard-text={store.shareUrl}
                  children={<Button>复制</Button>}
                />
              </div>
            )}
            placement="bottom-end"
          />
        )}
        {(welcoming || editing) && (
          <Dropdown
            label={({ ref, toggle }) => (
              <Button ref={ref} className="condition_button" onClick={toggle}>导入</Button>
            )}
            popper={() => (
              <div className="import card">
                <div className="import_title">使用方法：</div>
                <div>将下方的链接添加为浏览器书签（一种较方便的方式是拖拽下方链接至书签栏），</div>
                <div>然后打开想导入的配装所在的页面，点击此书签。</div>
                <a
                  ref={r => r && r.setAttribute('href', encodeURI(
                    `javascript:void(document.body.appendChild(document.createElement('script')).src='`
                    + location.origin + location.pathname + `import.js?'+Math.random())`))}
                  className="import_bookmarklet"
                  onClick={e => e.preventDefault()}
                  children="导入配装"
                />
                <div className="import_title">目前支持从以下配装器导入：</div>
                <div>Ariyala's Final Fantasy XIV Toolkit (ffxiv.ariyala.com)</div>
                <div>FF14俺tools：装備シミュレータ (ffxiv.es.exdreams.net)</div>
                <div>Etro (etro.gg)</div>
                <div className="import_warn">此功能可能因外部设计变动，不可预期地暂时不可用。</div>
              </div>
            )}
            placement="bottom-end"
          />
        )}
        {viewing && (
          <Button
            className="condition_button"
            onClick={() => {
              store.startEditing();
              history.pushState(null, document.title, location.href.replace(/\?.*$/, ''));  // TODO: recheck behavior
            }}
            children="编辑"
          />
        )}
        {/*<Button className="condition_button">历史记录</Button>*/}
        {(editing || viewing) && (
          <Dropdown
            label={({ ref, toggle }) => (
              <Button ref={ref} className="condition_button" onClick={toggle}>设置</Button>
            )}
            popper={() => (
              <div className="setting card">
                <div className="setting_section">
                  <span className="setting_title">装备名显示方式</span>
                  <span className="setting_sub">国服未实装的装备总会显示为装备来源</span>
                </div>
                <div className="setting_controls">
                  <Radio
                    label="显示装备名"
                    checked={store.setting.gearDisplayName === 'name'}
                    onChange={() => store.setting.setGearDisplayName('name')}
                  />
                  <Radio
                    label="显示装备来源"
                    checked={store.setting.gearDisplayName === 'source'}
                    onChange={() => store.setting.setGearDisplayName('source')}
                  />
                </div>
                <div className="setting_section">
                  <span className="setting_title">装备颜色方案</span>
                </div>
                <div className="setting_controls">
                  <Radio
                    label="区分竞品"
                    checked={store.setting.gearColorScheme === 'source'}
                    onChange={() => store.setting.setGearColorScheme('source')}
                  />
                  <Radio
                    label="按稀有度上色"
                    checked={store.setting.gearColorScheme === 'rarity'}
                    onChange={() => store.setting.setGearColorScheme('rarity')}
                  />
                  <Radio
                    label="不上色"
                    checked={store.setting.gearColorScheme === 'none'}
                    onChange={() => store.setting.setGearColorScheme('none')}
                  />
                </div>
                <div className="setting_section">
                  <span className="setting_title">魔晶石显示方式</span>
                </div>
                <div className="setting_controls">
                  <Radio
                    label="显示受增益的属性"
                    checked={store.setting.materiaDisplayName === 'stat'}
                    onChange={() => store.setting.setMateriaDisplayName('stat')}
                  />
                  <Radio
                    label="显示魔晶石本身的名字"
                    checked={store.setting.materiaDisplayName === 'materia'}
                    onChange={() => store.setting.setMateriaDisplayName('materia')}
                  />
                </div>
                <div className="setting_section">
                  <span className="setting_title">展示包含魔晶石增益的装备属性</span>
                </div>
                <div className="setting_controls">
                  <Radio
                    label="是，展示实际生效的属性"
                    checked={store.setting.displayMeldedStats}
                    onChange={() => store.setting.setDisplayMeldedStats(true)}
                  />
                  <Radio
                    label="否，展示装备的原始属性"
                    checked={!store.setting.displayMeldedStats}
                    onChange={() => store.setting.setDisplayMeldedStats(false)}
                  />
                </div>
                <div className="setting_section">
                  <span className="setting_title">高饱和度模式</span>
                  <span className="setting_sub">如果默认高亮颜色难以辨识请启用此模式</span>
                </div>
                <div className="setting_controls">
                  <Radio
                    label="不启用"
                    checked={!store.setting.highSaturation}
                    onChange={() => store.setting.setHighSaturation(false)}
                  />
                  <Radio
                    label="启用"
                    checked={store.setting.highSaturation}
                    onChange={() => store.setting.setHighSaturation(true)}
                  />
                </div>
              </div>
            )}
            placement="bottom-end"
          />
        )}
        <span className="condition_divider" />
        <span className="condition_version">数据版本 {G.versions.data}</span>
      </span>
      {(store.job === undefined || expandedPanel === 'job') && <JobSelector />}
    </div>
  );
});

interface ConditionLevelInputProps {
  value: number;
  onChange: (value: number) => void;
}
const ConditionLevelInput = observer<ConditionLevelInputProps>(({ value, onChange })  => {
  const [ inputValue, setInputValue ] = React.useState(value.toString());
  const [ prevValue, setPrevValue ] = React.useState(value);
  if (value !== prevValue) {
    setInputValue(value.toString());
    setPrevValue(value);
  }
  const inputRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    const handleWheel = (e: HTMLElementEventMap['wheel']) => {
      e.preventDefault();
      if (e.deltaY !== 0) {
        (e.target as HTMLInputElement).focus();
        const delta = e.deltaY < 0 ? 5 : -5;
        setInputValue(v => (parseInt(v) + delta).toString());
      }
    };
    // FIXME: use onWheel when https://github.com/facebook/react/issues/14856 fix
    inputRef.current!.addEventListener('wheel', handleWheel);
    return () => inputRef.current!.removeEventListener('wheel', handleWheel);
  }, []);
  return (
    <TextField
      inputRef={inputRef}
      className="condition_level-input"
      value={inputValue}
      onBlur={() => onChange(parseInt(inputValue))}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
    />
  );
});
