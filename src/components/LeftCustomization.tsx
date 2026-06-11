'use client';
import styles from './style.module.css';

import { useState, useEffect, useMemo } from 'react';
import { useStore } from '@/store';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import { hsvaToRgbString, hsvaToRgbaString } from '@uiw/color-convert';
import { Hue, Saturation, ShadeSlider, Alpha, Slider } from '@uiw/react-color';

import { eventBus } from '@/utils/eventBus';
import { sceneConfig } from '@/lib/manager/constantsConfig';
import { useColorStore } from '@/store/useColorStore';

// H 决定是什么颜色 0°/360 = 红，60°= 黄，120°= 绿，180°= 青，240°= 蓝，300°= 紫
// 饱和度 S  颜色鲜艳程度：发灰 -> 艳丽
// 亮度 L  颜色明暗程度：黑 -> 白

// 模型	            H 色相	  S 饱和度	   V 明度 / L 亮度	A 透明度
// HSVA（选择器）	  0 ~ 360   0 ~ 100	    0 ~ 100	         0 ~ 1
// HSL（Three.js） 0 ~ 1	    0 ~ 1	       0 ~ 1	        0 ~ 1

export default function LeftCustomization({ currentModule }: { currentModule: number }) {
  const { colorChooseVisible } = useColorStore(useShallow((state) => state));
  const isVisible = colorChooseVisible && currentModule === 5;

  const isMobile = useStore((state) => state.isMobile);

  // 色相
  const colorList = useColorStore((state) => state.colorList);
  const customColor = colorList.get('custom')!;
  const { h, s, l } = customColor.hsl!;
  const { metal, rough } = customColor;
  const updateHue = useColorStore((state) => state.updateHue);
  const updateL = useColorStore((state) => state.updateL);
  const updateS = useColorStore((state) => state.updateS);
  const updateMetal = useColorStore((state) => state.updateMetal);
  const updateRough = useColorStore((state) => state.updateRough);

  const hsva = { h: h * 360, s: s * 100, v: l * 100, a: 1 };

  const updateColor = useColorStore((state) => state.updateColor);

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
            {!isMobile ? (
              <div className="LeftCustomBar-container" style={{ opacity: 1, transform: 'none' }}>
                <div className="LeftCustomBar-content">
                  <div className="LeftCustomBar-top">
                    <div className="Slider-content" style={{ opacity: 1, transform: 'none' }}>
                      <div className="Slider-table">
                        <p>色相</p>
                        <Hue
                          className="SliderHue"
                          hue={h * 360}
                          onChange={(newHue) => {
                            updateHue(newHue.h / 360);
                          }}
                          style={{
                            width: '11rem',
                            height: '5px',
                            borderRadius: '10px',
                          }}
                        />
                      </div>

                      <div className="Slider-table">
                        <p>饱和度</p>
                        <Alpha
                          className="SliderHue"
                          background={`linear-gradient(to right, ${hsvaToRgbaString({ ...hsva, s: 0 })}, ${hsvaToRgbaString({ ...hsva, s: 100 })})`}
                          hsva={{ ...hsva, a: s }}
                          style={{
                            width: '11rem',
                            height: '5px',
                            borderRadius: '10px',
                          }}
                          onChange={(color) => {
                            updateS(color.a);
                          }}
                        />
                      </div>

                      <div className="Slider-table">
                        <p>明度</p>
                        <Alpha
                          className="SliderHue"
                          background={`linear-gradient(to right, ${`rgb(0, 0, 0)`}, ${hsvaToRgbaString({ h: h * 360, s: s * 100, v: 50, a: 1 })}, ${`rgb(255, 255, 255)`})`}
                          hsva={{ ...hsva, a: l }}
                          style={{
                            width: '11rem',
                            height: '5px',
                            borderRadius: '10px',
                          }}
                          onChange={(color) => {
                            updateL(color.a);
                          }}
                        />
                      </div>

                      <div className="Slider-table">
                        <p>金属度</p>
                        <Alpha
                          className="SliderHue"
                          background={`linear-gradient(to right, rgb(0,0,0), rgb(255,255,255))`}
                          hsva={{ ...hsva, a: metal }}
                          style={{
                            width: '11rem',
                            height: '5px',
                            borderRadius: '10px',
                          }}
                          onChange={(color) => {
                            updateMetal(color.a);
                          }}
                        />
                      </div>

                      <div className="Slider-table">
                        <p>粗糙度</p>
                        <Alpha
                          className="SliderHue"
                          background={`linear-gradient(to right, rgb(0,0,0), rgb(255,255,255))`}
                          hsva={{ ...hsva, a: rough }}
                          style={{
                            width: '11rem',
                            height: '5px',
                            borderRadius: '10px',
                          }}
                          onChange={(color) => {
                            updateRough(color.a);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
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
                      style={{
                        width: '20rem',
                        height: '16rem',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'space-evenly',
                          height: '16rem',
                          width: '4rem',
                        }}
                        className={styles.hueWrapper}
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
                        <Alpha
                          direction="vertical"
                          reverse={true}
                          background={`linear-gradient(to bottom, rgb(0,0,0), rgb(255,255,255))`}
                          hsva={{ ...hsva, a: rough }}
                          style={{
                            width: '5px',
                            height: '11rem',
                            borderRadius: '10px',
                            position: 'relative',
                          }}
                          radius="3px"
                          onChange={(color) => {
                            updateRough(color.a);
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
                        className={styles.hueWrapper}
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
                        <Alpha
                          direction="vertical"
                          reverse={true}
                          background={`linear-gradient(to bottom, rgb(0,0,0), rgb(255,255,255))`}
                          hsva={{ ...hsva, a: metal }}
                          style={{
                            width: '5px',
                            height: '11rem',
                            borderRadius: '10px',
                          }}
                          radius="3px"
                          onChange={(color) => {
                            updateMetal(color.a);
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
                        className={styles.hueWrapper}
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
                        <Alpha
                          direction="vertical"
                          reverse={true}
                          background={`linear-gradient(to bottom, ${`rgb(0, 0, 0)`}, ${hsvaToRgbaString({ h: h * 360, s: s * 100, v: 50, a: 1 })}, ${`rgb(255, 255, 255)`})`}
                          hsva={{ ...hsva, a: l }}
                          style={{
                            width: '5px',
                            height: '11rem',
                            borderRadius: '10px',
                          }}
                          radius="3px"
                          onChange={(color) => {
                            updateL(color.a);
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
                        className={styles.hueWrapper}
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
                        <Alpha
                          direction="vertical"
                          background={`linear-gradient(to bottom, ${hsvaToRgbaString({ ...hsva, s: 0 })}, ${hsvaToRgbaString({ ...hsva, s: 100 })})`}
                          reverse={true}
                          hsva={{ ...hsva, a: s }}
                          style={{
                            width: '5px',
                            height: '11rem',
                            borderRadius: '10px',
                          }}
                          radius="3px"
                          onChange={(color) => {
                            updateS(color.a);
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
                        className={styles.hueWrapper}
                      >
                        <p
                          style={{
                            transform: 'rotate(90deg)',
                            transformOrigin: 'center center',
                            color: '#fff',
                            width: '3rem',
                            margin: '0px 1rem 2px',
                            pointerEvents: 'none',
                          }}
                        >
                          色相
                        </p>
                        <Hue
                          direction="vertical"
                          reverse={true}
                          hue={h * 360}
                          style={{
                            width: '5px',
                            height: '11rem',
                            borderRadius: '10px',
                            position: 'relative',
                          }}
                          radius="3px"
                          onChange={(newHue) => {
                            updateHue(newHue.h / 360);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

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
