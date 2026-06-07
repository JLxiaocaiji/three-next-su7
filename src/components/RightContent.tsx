'use client';

import { useTap } from '@/hook/index';
import { useStore } from '@/store/index';
export default function RightContent({ currentModule }: { currentModule: Module }) {
  type Part = { stepLabel: string; currentModule: Module };

  const partList: Part[] = [
    { stepLabel: 'SU7', currentModule: 1 },
    { stepLabel: '车身', currentModule: 2 },
    { stepLabel: '风阻', currentModule: 3 },
    { stepLabel: '雷达', currentModule: 4 },
    { stepLabel: '定制', currentModule: 5 },
  ];

  const { setCurrentModule } = useStore();

  const tap = useTap((e: Part) => {
    setCurrentModule(e.currentModule);
  });

  return (
    <>
      {/* 右侧边 */}
      <div className="StateTable-container" style={{ opacity: '1', transition: '0.2s 0.3s' }}>
        <div className="StateTable-content" style={{ opacity: '1', transform: 'none' }}>
          <div className="backgroundLine"></div>

          {partList.map((item, index) => (
            <div
              onClick={() => tap(item)}
              className="item"
              key={item.currentModule}
              style={
                item.currentModule === currentModule ? { backgroundColor: 'rgb(255, 146, 69)' } : {}
              }
            >
              {item.currentModule === currentModule ? <div className="item-Line" /> : null}
              <div className="tableName">
                <div
                  style={
                    item.currentModule === currentModule
                      ? { color: 'rgb(255, 255, 255)', fontSize: '0.9rem' }
                      : {}
                  }
                >
                  {item.stepLabel}
                </div>
              </div>
              <div className="clickBox"></div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
