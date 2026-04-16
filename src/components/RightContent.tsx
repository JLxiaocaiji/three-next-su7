export default function RightContent() {
  return (
    <>
      {/* 右侧边 */}
      <div className="StateTable-container" style={{ opacity: '1', transition: '0.2s 0.3s' }}>
        <div className="StateTable-content" style={{ opacity: '1', transform: 'none' }}>
          <div className="backgroundLine"></div>
          <div className="item" style={{ backgroundColor: 'rgb(255, 146, 69)' }}>
            <div className="item-Line"></div>
            <div className="tableName">
              <div style={{ color: 'rgb(255, 255, 255)', fontSize: '0.9rem' }}>SU7</div>
            </div>
            <div className="clickBox"></div>
          </div>
          <div className="item">
            <div className="tableName">
              <div>车身</div>
            </div>
            <div className="clickBox"></div>
          </div>
          <div className="item">
            <div className="tableName">
              <div>风阻</div>
            </div>
            <div className="clickBox"></div>
          </div>
          <div className="item">
            <div className="tableName">
              <div>雷达</div>
            </div>
            <div className="clickBox"></div>
          </div>
          <div className="item">
            <div className="tableName">
              <div>定制</div>
            </div>
            <div className="clickBox"></div>
          </div>
        </div>
      </div>
    </>
  );
}
