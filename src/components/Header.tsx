'use client';

import { useAudioStore } from '@/store/useAudioStore';

export default function Header({ currentModule }: { currentModule: number }) {
  const isPlayingBgm = useAudioStore((state) => state.isPlayingBgm);
  console.log('isPlayingBgm', isPlayingBgm);
  const setPlayBgm = useAudioStore((state) => state.setPlayBgm);

  return (
    <>
      {/* header */}
      <div className="TopInfo-container" style={{ opacity: 1 }}>
        {currentModule === 1 && (
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
        )}

        {currentModule === 2 && (
          <div className="TopInfo-content" style={{ opacity: 1, transform: 'none' }}>
            <div style={{ marginTop: '6vmin', color: 'rgb(240, 198, 159)', fontSize: '2vmin' }}>
              「外观设计」
            </div>
            <div style={{ marginTop: '2vmin', color: 'rgb(255, 255, 255)', fontSize: '2vmin' }}>
              优雅与速度感并存经得起时间考验的设计
            </div>
            <div style={{ marginTop: '2vmin', color: 'rgb(170, 170, 170)', fontSize: '1.4vmin' }}>
              遵循「符合直觉」的美学设计理念，造就Xiaomi SU7 经典的流畅车身线条。
            </div>
            <div style={{ marginTop: '2vmin', color: 'rgb(170, 170, 170)', fontSize: '1.4vmin' }}>
              富有力量的车身线条与自然舒展的车身比例，让优雅与速度相得益彰。
            </div>
          </div>
        )}
        {currentModule === 3 && (
          <div className="TopInfo-content" style={{ opacity: 1, transform: 'none' }}>
            <div style={{ marginTop: '4vmin', color: 'rgb(255, 255, 255)', fontSize: '1.6vmin' }}>
              出色的超低风阻系数
            </div>
            <div style={{ marginTop: '1.2vmin', color: 'rgb(240, 198, 159)', fontSize: '4vmin' }}>
              Cd 0.195
            </div>
            <div style={{ marginTop: '1.2vmin', color: 'rgb(255, 255, 255)', fontSize: '1.6vmin' }}>
              风，就是最好的设计师。
            </div>
            <div style={{ marginTop: '1.2vmin', color: 'rgb(255, 255, 255)', fontSize: '1.6vmin' }}>
              经过 1000 次以上仿真实验和超过 300次油泥模型调整，不断寻找风道、车身曲线的最优解。
            </div>
            <div style={{ marginTop: '1.2vmin', color: 'rgb(255, 255, 255)', fontSize: '1.6vmin' }}>
              最终达成 Cd0.195 超低风阻系数，带来难以想象的低能耗和出色续航表现。
            </div>
          </div>
        )}
        {currentModule === 4 && (
          <div className="TopInfo-content" style={{ opacity: 1, transform: 'none' }}>
            <div style={{ marginTop: '4vmin', color: 'rgb(240, 198, 159)', fontSize: '1.8vmin' }}>
              「智能驾驶」
            </div>
            <div style={{ marginTop: '2vmin', color: 'rgb(255, 255, 255)', fontSize: '2vmin' }}>
              隆重介绍XiaomiPilot更聪明、更安全的智能驾驶系统
            </div>
            <div style={{ marginTop: '2vmin', color: 'rgb(170, 170, 170)', fontSize: '1.4vmin' }}>
              搭载两颗 NVIDIA DRIVE Orin 芯片，综合算力高达 508
              TOPS，感知硬件具备罕见的大范围探测能力；
            </div>
            <div style={{ marginTop: '2vmin', color: 'rgb(170, 170, 170)', fontSize: '1.4vmin' }}>
              在此之上，以领先行业的智能驾驶算法深度赋能小米全栈自研的全场景智能辅助驾驶。
            </div>
            <div className="addon" style={{ fontSize: '2vmin' }}>
              <div style={{ marginTop: '10vmin' }}>
                <div>激光雷达</div>
                <div style={{ color: 'rgb(255, 146, 69)' }}>x1</div>
              </div>
              <div>
                <div>高清摄像头</div>
                <div style={{ color: 'rgb(255, 146, 69)' }}>x11</div>
              </div>
              <div>
                <div>毫米波雷达</div>
                <div style={{ color: 'rgb(255, 146, 69)' }}>x3</div>
              </div>
              <div>
                <div>超声波雷达</div>
                <div style={{ color: 'rgb(255, 146, 69)' }}>x12</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 右上角 */}
      <div className="Logo-container">
        <div className="Logo-content">
          <p style={{ marginRight: '0.3rem', fontWeight: '300' }}>Copy From:</p>
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
        <div
          className="Mute-content"
          onClick={() => {
            setPlayBgm();
          }}
        >
          <img src={isPlayingBgm ? '/icon/open.webp' : '/icon/mute.webp'} alt="" />
        </div>
      </div>
    </>
  );
}
