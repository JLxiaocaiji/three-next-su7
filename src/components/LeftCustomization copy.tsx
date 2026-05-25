'use client';

import { useState, useEffect } from 'react';
import { hsvaToRgbaString } from '@uiw/color-convert';
import Hue from '@uiw/react-color-hue';

import { eventBus } from '@/utils/eventBus';

export default function LeftCustomization({ part }: { part: number }) {
  const [isVisible, setIsVisible] = useState(false);

  const [hsva, setHsva] = useState({ h: 0, s: 100, v: 100, a: 1 });

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
            <div className="LeftCustomBar-container" style={{ opacity: 1, transform: 'none' }}>
              <div className="LeftCustomBar-content">
                <div className="LeftCustomBar-top">
                  <div className="Slider-content" style={{ opacity: 1, transform: 'none' }}>
                    {/* 色相 */}
                    <div className="Slider-table">
                      <p>色相</p>
                      {/* <div
                        className="w-color-alpha w-color-alpha-horizontal w-color-saturation SliderHue"
                        style={{
                          '--alpha-background-color': '#fff',
                          '--alpha-pointer-background-color': 'rgb(248, 248, 248)',
                          '--alpha-pointer-box-shadow': 'rgb(0 0 0 / 37%) 0px 1px 4px 0px',
                          borderRadius: '50%',
                          backgroundImage:
                            'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==")',
                          backgroundPosition: 'left center',
                          height: '5px',
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            inset: '0px',
                            position: 'absolute',
                            background:
                              'linear-gradient(to right, rgb(255,0,0) 0%, rgb(255,255,0) 17%, rgb(0,255,0) 33%, rgb(0,255,255) 50%, rgb(0,0,255) 67%, rgb(255,0,255) 83%, rgb(255,0,0) 100%)',
                            borderRadius: '3px',
                          }}
                        ></div>
                        <div
                          className="w-color-interactive"
                          tabIndex={0}
                          style={{
                            inset: '0px',
                            zIndex: 1,
                            position: 'absolute',
                            touchAction: 'none',
                          }}
                        >
                          <div
                            className="w-color-alpha-pointer"
                            style={{
                              position: 'absolute',
                              left: '11.1972%',
                            }}
                          >
                            <div
                              className="w-color-alpha-fill"
                              style={{
                                width: '18px',
                                height: '18px',
                                boxShadow: 'var(--alpha-pointer-box-shadow)',
                                borderRadius: '50%',
                                backgroundColor: 'var(--alpha-pointer-background-color)',
                                transform: 'translate(-9px, -1px)',
                              }}
                            ></div>
                          </div>
                        </div>
                      </div> */}
                      <Hue
                        className="SliderHue"
                        hue={hsva.h}
                        onChange={(newHue) => {
                          setHsva({ ...hsva, ...newHue });
                        }}
                        style={{
                          borderRadius: '50%',
                        }}
                        // style={{
                        //   '--alpha-background-color': '#fff',
                        //   '--alpha-pointer-background-color': 'rgb(248,248,248)',
                        //   '--alpha-pointer-box-shadow': 'rgb(0 0 0 / 37%) 0px 1px 4px 0px',
                        //   borderRadius: '50%',
                        //   backgroundImage:
                        //     'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==")',
                        //   backgroundPosition: 'left center',
                        //   height: '5px',
                        //   position: 'relative',
                        // }}
                      />
                    </div>

                    {/* 饱和度 */}
                    <div className="Slider-table">
                      <p>饱和度</p>
                      <div
                        className="w-color-alpha w-color-alpha-horizontal w-color-saturation SliderHue"
                        style={{
                          '--alpha-background-color': '#fff',
                          '--alpha-pointer-background-color': 'rgb(248,248,248)',
                          '--alpha-pointer-box-shadow': 'rgb(0 0 0 / 37%) 0px 1px 4px 0px',
                          borderRadius: '50%',
                          backgroundImage:
                            'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==")',
                          backgroundPosition: 'left center',
                          height: '5px',
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            inset: '0px',
                            position: 'absolute',
                            background: 'linear-gradient(to right, rgb(0,0,0), rgb(255,171,0))',
                            borderRadius: '3px',
                          }}
                        ></div>
                        <div
                          className="w-color-interactive"
                          tabIndex={0}
                          style={{
                            inset: '0px',
                            zIndex: 1,
                            position: 'absolute',
                            touchAction: 'none',
                          }}
                        >
                          <div
                            className="w-color-alpha-pointer"
                            style={{
                              position: 'absolute',
                              left: '100%',
                            }}
                          >
                            <div
                              className="w-color-alpha-fill"
                              style={{
                                width: '18px',
                                height: '18px',
                                boxShadow: 'var(--alpha-pointer-box-shadow)',
                                borderRadius: '50%',
                                backgroundColor: 'var(--alpha-pointer-background-color)',
                                transform: 'translate(-9px, -1px)',
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 明度 */}
                    <div className="Slider-table">
                      <p>明度</p>
                      <div
                        className="w-color-alpha w-color-alpha-horizontal w-color-saturation SliderHue"
                        style={{
                          '--alpha-background-color': '#fff',
                          '--alpha-pointer-background-color': 'rgb(248,248,248)',
                          '--alpha-pointer-box-shadow': 'rgb(0 0 0 / 37%) 0px 1px 4px 0px',
                          borderRadius: '50%',
                          backgroundImage:
                            'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==")',
                          backgroundPosition: 'left center',
                          height: '5px',
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            inset: '0px',
                            position: 'absolute',
                            background: 'linear-gradient(to right, rgb(0,0,0), rgb(255,255,255))',
                            borderRadius: '3px',
                          }}
                        ></div>
                        <div
                          className="w-color-interactive"
                          tabIndex={0}
                          style={{
                            inset: '0px',
                            zIndex: 1,
                            position: 'absolute',
                            touchAction: 'none',
                          }}
                        >
                          <div
                            className="w-color-alpha-pointer"
                            style={{
                              position: 'absolute',
                              left: '62.35%',
                            }}
                          >
                            <div
                              className="w-color-alpha-fill"
                              style={{
                                width: '18px',
                                height: '18px',
                                boxShadow: 'var(--alpha-pointer-box-shadow)',
                                borderRadius: '50%',
                                backgroundColor: 'var(--alpha-pointer-background-color)',
                                transform: 'translate(-9px, -1px)',
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 金属度 */}
                    <div className="Slider-table">
                      <p>金属度</p>
                      <div
                        className="w-color-alpha w-color-alpha-horizontal w-color-saturation SliderHue"
                        style={{
                          '--alpha-background-color': '#fff',
                          '--alpha-pointer-background-color': 'rgb(248,248,248)',
                          '--alpha-pointer-box-shadow': 'rgb(0 0 0 / 37%) 0px 1px 4px 0px',
                          borderRadius: '50%',
                          backgroundImage:
                            'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==")',
                          backgroundPosition: 'left center',
                          height: '5px',
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            inset: '0px',
                            position: 'absolute',
                            background: 'linear-gradient(to right, rgb(0,0,0), rgb(255,255,255))',
                            borderRadius: '3px',
                          }}
                        ></div>
                        <div
                          className="w-color-interactive"
                          tabIndex={0}
                          style={{
                            inset: '0px',
                            zIndex: 1,
                            position: 'absolute',
                            touchAction: 'none',
                          }}
                        >
                          <div
                            className="w-color-alpha-pointer"
                            style={{
                              position: 'absolute',
                              left: '10%',
                            }}
                          >
                            <div
                              className="w-color-alpha-fill"
                              style={{
                                width: '18px',
                                height: '18px',
                                boxShadow: 'var(--alpha-pointer-box-shadow)',
                                borderRadius: '50%',
                                backgroundColor: 'var(--alpha-pointer-background-color)',
                                transform: 'translate(-9px, -1px)',
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 粗糙度 */}
                    <div className="Slider-table">
                      <p>粗糙度</p>
                      <div
                        className="w-color-alpha w-color-alpha-horizontal w-color-saturation SliderHue"
                        style={{
                          '--alpha-background-color': '#fff',
                          '--alpha-pointer-background-color': 'rgb(248,248,248)',
                          '--alpha-pointer-box-shadow': 'rgb(0 0 0 / 37%) 0px 1px 4px 0px',
                          borderRadius: '50%',
                          backgroundImage:
                            'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==")',
                          backgroundPosition: 'left center',
                          height: '5px',
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            inset: '0px',
                            position: 'absolute',
                            background: 'linear-gradient(to right, rgb(0,0,0), rgb(255,255,255))',
                            borderRadius: '3px',
                          }}
                        ></div>
                        <div
                          className="w-color-interactive"
                          tabIndex={0}
                          style={{
                            inset: '0px',
                            zIndex: 1,
                            position: 'absolute',
                            touchAction: 'none',
                          }}
                        >
                          <div
                            className="w-color-alpha-pointer"
                            style={{
                              position: 'absolute',
                              left: '3%',
                            }}
                          >
                            <div
                              className="w-color-alpha-fill"
                              style={{
                                width: '18px',
                                height: '18px',
                                boxShadow: 'var(--alpha-pointer-box-shadow)',
                                borderRadius: '50%',
                                backgroundColor: 'var(--alpha-pointer-background-color)',
                                transform: 'translate(-9px, -1px)',
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
              <div className="camera" style={{ marginBottom: '4rem' }}>
                <img src="/icon/photo.webp" alt="拍照" style={{ width: '2.4rem' }} />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
