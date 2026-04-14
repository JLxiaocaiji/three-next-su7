export default function Header() {
  return (
    <>
      {/* header */}
      <div className="TopInfo-container" style={{ opacity: 1 }}>
        <div className="TopInfo-content" style={{ opacity: 1, transform: 'none' }}>
          <img
            src="/icon/xiaomi_su7.webp"
            alt=""
            style={{ width: '40vmin', marginTop: '10vmin' }}
          />
          <div
            style={{ marginTop: '2vmin', color: 'rgba(255, 255, 255, 0.733)', fontSize: '2vmin' }}
          >
            C级高性能 生态科技轿车
          </div>
        </div>
      </div>

      {/* 右上角 */}
      <div className="Logo-container">
        <div className="Logo-content">
          <p style={{ marginRight: '0.3rem', fontWeight: '300' }}>Author:</p>
          <p style={{ color: 'rgb(255, 141, 26)', fontWeight: 600 }}>GameMCU</p>
          <p
            style={{
              marginRight: '0.3rem',
              color: 'rgb(255, 255, 255)',
              fontWeight: 300,
              marginLeft: '0.4rem',
            }}
          >
            Sound:
          </p>
          <p style={{ color: 'rgb(255, 141, 26)', fontWeight: 600 }}>Cuer_Zhao</p>
        </div>
      </div>
      {/* 右上角 静音 */}
      <div className="Mute-container">
        <div className="Mute-content">
          <img src="/icon/open.webp" alt="" />
        </div>
      </div>
    </>
  );
}
