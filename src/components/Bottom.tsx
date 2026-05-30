export default function Bottom({ currentModule }: { currentModule: Module }) {
  return (
    <>
      {/* bottom */}
      <div style={{ opacity: 1, transition: '0.2s 0.3s' }}>
        <div className="ColorBar-container" style={{ opacity: 1, transform: 'none' }}>
          <div className="ColorBar-content">
            <div style={{ display: 'flex', opacity: 1, transform: 'none' }}>
              <div
                className="Bar"
                style={{
                  backgroundColor: 'rgb(255, 192, 63)',
                  backgroundImage: 'url(/icon/custom.webp)',
                }}
              ></div>
              <div className="Bar" style={{ backgroundImage: 'url(/icon/b1.webp)' }}></div>
              <div className="Bar" style={{ backgroundImage: 'url("/icon/b2.webp")' }}></div>
              <div className="Bar" style={{ backgroundImage: 'url("/icon/b3.webp")' }}></div>
              <div className="Bar" style={{ backgroundImage: 'url("/icon/b4.webp")' }}></div>
              <div className="Bar" style={{ backgroundImage: 'url("/icon/b5.webp")' }}></div>
              <div className="Bar" style={{ backgroundImage: 'url("/icon/b6.webp")' }}></div>
              <div className="Bar" style={{ backgroundImage: 'url("/icon/b7.webp")' }}></div>
              <div className="Bar" style={{ backgroundImage: 'url("/icon/b8.webp")' }}></div>
              <div className="Bar" style={{ backgroundImage: 'url("/icon/b9.webp")' }}></div>
              <div className="Bar" style={{ backgroundImage: 'url("/icon/b10.webp")' }}></div>
              <div className="Bar" style={{ backgroundImage: 'url("/icon/b12.webp")' }}></div>
              <div className="Bar" style={{ backgroundImage: 'url("/icon/b13.webp")' }}></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
