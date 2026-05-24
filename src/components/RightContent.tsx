'use client';

import { useTap } from '@/hook/index';
import { eventBus } from '@/utils/eventBus';
export default function RightContent({
  part,
  setPart,
}: {
  part: Module;
  setPart: (part: Module) => void;
}) {
  type Part = { stepLabel: string; partId: Module };

  const partList: Part[] = [
    { stepLabel: 'SU7', partId: 0 },
    { stepLabel: '车身', partId: 1 },
    { stepLabel: '风阻', partId: 2 },
    { stepLabel: '雷达', partId: 3 },
    { stepLabel: '定制', partId: 4 },
  ];

  const tap = useTap((e: Part) => {
    setPart(e.partId);
    eventBus.emit('UI-RightContent:changeModule', { module: e.partId });
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
              key={item.partId}
              style={item.partId === part ? { backgroundColor: 'rgb(255, 146, 69)' } : {}}
            >
              <div className="tableName">
                <div
                  style={
                    item.partId === part ? { color: 'rgb(255, 255, 255)', fontSize: '0.9rem' } : {}
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
