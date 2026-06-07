'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/store';
import * as THREE from 'three';
import { hsvaToRgbaString } from '@uiw/color-convert';
import { Hue, Saturation, ShadeSlider, Alpha, Slider } from '@uiw/react-color';

import { eventBus } from '@/utils/eventBus';

/**
hsva = {
  h: 0~360,    // 色相
  s: 0~1,      // 饱和度
  v: 0~1,      // 明度
  a: 0~1       // 透明度（不用管）
}
 * @returns 
 */

const custom = {
  col: new THREE.Color('#ffc03f').convertSRGBToLinear(),
  hsl: { h: 40.31 / 360, s: 1, l: 0.6235 },
  bgUrl: 'custom.png',
  rough: 0.03,
  metal: 0.1,
};
export default function LeftCustomization({ currentModule }: { currentModule: number }) {
  const [hsva, setHsva] = useState({ h: 0, s: 0, v: 0, a: 1 });

  const [color, setColor] = useState('#4a86ff');

  const [value, setValue] = useState(20);

  const isVisible = currentModule === 5;

  const CustomPointer = () => (
    <div
      style={{
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        backgroundColor: '#fff',
        boxShadow: '0 0 4px rgba(0,0,0,0.4)',
        // 在这里直接偏移，不依赖任何外部 CSS 文件
        transform: 'translate(-6px, -9px)',
      }}
    />
  );

  return (
    <>
      {isVisible && (
        <>
          {/* 左侧调色面板 */}
          <div
            style={{
              opacity: 1,
              transition: '0.2s 0.3s',
              // opacity: isVisible ? 1 : 0,
              // transition: 'opacity 0.3s ease 0.2s, transform 0.3s ease 0.2s',
              // transform: isVisible ? 'translateX(0)' : 'translateX(-20px)',
            }}
          >
            <div
              style={{
                opacity: 1,
                transform: 'translateY(-50%) rotate(-90deg)',
                transformOrigin: 'center center',
                position: 'absolute',
                left: '5vmin',
                top: '50%',
                fontSize: '2.5vmin',
              }}
            >
              <div
                style={{
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                  }}
                >
                  <div
                    // className="Slider-content"
                    style={{
                      width: '20rem',
                      height: '16rem',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {/* 色相 */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-evenly',
                        height: '16rem',
                        width: '4rem',
                      }}
                    >
                      <p
                        style={{
                          transform: 'rotate(90deg)',
                          transformOrigin: 'center center',
                          color: '#fff',
                          width: '3rem',
                          margin: '0px 1rem 2px',
                        }}
                      >
                        粗糙度
                      </p>
                      <Hue
                        className="SliderHue1"
                        direction="vertical"
                        reverse={true}
                        hue={hsva.h}
                        pointer={CustomPointer}
                        style={{
                          width: '5px',
                          height: '11rem',
                          borderRadius: '10px',
                          backgroundPosition: 'left center',
                        }}
                        radius="3px"
                        onChange={(newValue) => {
                          setHsva((prev) => ({ ...prev, h: newValue.h }));
                        }}
                      />
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-evenly',
                        height: '16rem',
                        width: '4rem',
                      }}
                    >
                      <p
                        style={{
                          transform: 'rotate(90deg)',
                          transformOrigin: 'center center',
                          color: '#fff',
                          width: '3rem',
                          margin: '0px 1rem 2px',
                        }}
                      >
                        金属度
                      </p>
                      <Hue
                        className="SliderHue1"
                        direction="vertical"
                        reverse={true}
                        hue={hsva.h}
                        pointer={CustomPointer}
                        style={{
                          width: '5px',
                          height: '11rem',
                          borderRadius: '10px',
                          backgroundPosition: 'left center',
                        }}
                        radius="3px"
                        onChange={(newValue) => {
                          setHsva((prev) => ({ ...prev, h: newValue.h }));
                        }}
                      />
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-evenly',
                        height: '16rem',
                        width: '4rem',
                      }}
                    >
                      <p
                        style={{
                          transform: 'rotate(90deg)',
                          transformOrigin: 'center center',
                          color: '#fff',
                          width: '3rem',
                          margin: '0px 1rem 2px',
                        }}
                      >
                        明度
                      </p>
                      <Hue
                        className="SliderHue1"
                        direction="vertical"
                        reverse={true}
                        hue={hsva.h}
                        pointer={CustomPointer}
                        style={{
                          width: '5px',
                          height: '11rem',
                          borderRadius: '10px',
                          backgroundPosition: 'left center',
                        }}
                        radius="3px"
                        onChange={(newValue) => {
                          const g = custom.col;
                          const _ = custom.hsl;
                          setHsva((prev) => ({ ...prev, h: newValue.h }));
                        }}
                      />
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-evenly',
                        height: '16rem',
                        width: '4rem',
                      }}
                    >
                      <p
                        style={{
                          transform: 'rotate(90deg)',
                          transformOrigin: 'center center',
                          color: '#fff',
                          width: '3rem',
                          margin: '0px 1rem 2px',
                        }}
                      >
                        饱和度
                      </p>
                      <Hue
                        className="SliderHue1"
                        direction="vertical"
                        reverse={true}
                        hue={hsva.h}
                        pointer={CustomPointer}
                        style={{
                          width: '5px',
                          height: '11rem',
                          borderRadius: '10px',
                          backgroundPosition: 'left center',
                        }}
                        radius="3px"
                        onChange={(newValue) => {
                          const g = custom.col;
                          const _ = custom.hsl;
                          setHsva((prev) => ({ ...prev, h: newValue.h }));
                        }}
                      />
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-evenly',
                        height: '16rem',
                        width: '4rem',
                      }}
                    >
                      <p
                        style={{
                          transform: 'rotate(90deg)',
                          transformOrigin: 'center center',
                          color: '#fff',
                          width: '3rem',
                          margin: '0px 1rem 2px',
                        }}
                      >
                        色相
                      </p>
                      <Hue
                        className="SliderHue1"
                        direction="vertical"
                        reverse={true}
                        hue={hsva.h}
                        pointer={CustomPointer}
                        style={{
                          width: '5px',
                          height: '11rem',
                          borderRadius: '10px',
                          backgroundPosition: 'left center',
                        }}
                        radius="3px"
                        onChange={(newValue) => {
                          setHsva((prev) => ({ ...prev, h: newValue.h }));
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* <div className="LeftCustomBar-container" style={{ opacity: 1, transform: 'none' }}>
            <div className="LeftCustomBar-content">
              <div className="LeftCustomBar-top">
                <div className="Slider-content" style={{ opacity: 1, transform: 'none' }}>
                  <div className="Slider-table">
                    <p>色相</p>
                    <Hue
                      className="SliderHue"
                      hue={hsva.h}
                      onChange={(newHue) => {
                        setHsva({ ...hsva, ...newHue });
                      }}
                      style={{
                        borderRadius: '50%',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div> */}

          {/* 截图按钮 */}
          <div
            style={{
              opacity: 1,
              transition: '0.2s 0.3s',
              // opacity: isVisible ? 1 : 0,
              // transition: 'opacity 0.3s ease 0.4s, transform 0.3s ease 0.4s',
              // transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
            }}
          >
            <div
              id="screenshot"
              className="screenshot"
              style={{
                pointerEvents: 'none',
                zIndex: 2,
                opacity: 1,
                transform: 'none',
              }}
            >
              <div style={{ display: 'none' }}>
                <img id="screenshot-img" alt="" />
                <p>长按图片可保存并分享</p>
              </div>
              <div
                className="camera"
                style={{ marginBottom: '4rem' }}
                onClick={() => {
                  eventBus.emit('ScreenshotManager:screenshot');
                }}
              >
                <img src="/icon/photo.webp" alt="拍照" style={{ width: '2.4rem' }} />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
