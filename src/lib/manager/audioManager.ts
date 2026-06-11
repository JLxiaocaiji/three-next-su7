import * as THREE from 'three';
import gsap from 'gsap';

import { sceneConfig } from './constantsConfig';

// https://threejs.org/examples/?q=box#webaudio_sandbox

// 定义状态枚举
enum InteractionState {
  DYNAMICS = 'State1',
  ACTION = 'State2',
  SCAN = 'State3',
}

interface AudioConfig {
  volume?: number; // 音量
  loop?: boolean; // 是否循环播放
  autoplay?: boolean; // 是否自动播放
  distanceModel?: 'linear' | 'inverse' | 'exponential'; // 衰减模式
  refDistance?: number; // 衰减参考距离
  maxDistance?: number; // 衰减最大距离
  rolloffFactor?: number; // 衰减因子
}

interface AudioPlayConfig extends AudioConfig {
  fadeIn?: number; // 淡入时长（秒）
  fadeOut?: number; // 淡出时长（秒）
  stopPrevious?: boolean; // 播放前是否停止同类型所有音频
}

// 位置音频
interface PositionalAudioConfig extends AudioConfig {
  position?: THREE.Vector3;
  object?: THREE.Object3D;
}

interface PositionalAudioPlayConfig {
  position?: THREE.Vector3;
  fadeIn?: number;
  volume?: number;
}

export class AudioManager {
  private static instance: AudioManager;
  private audioContext: AudioContext | null = null;
  private listener: THREE.AudioListener | null = null;
  private audioLoader: THREE.AudioLoader;
  private audioCache: Map<string, AudioBuffer>;
  private backgroundMusic: THREE.Audio | null = null; // 背景音乐
  private backgroundMusics: Map<string, THREE.Audio>;
  private positionalAudio: THREE.PositionalAudio | null = null; // 3D空间音频
  private positionalAudios: Map<string, THREE.PositionalAudio>;
  private playingAudios: Set<THREE.Audio | THREE.PositionalAudio>;
  private audioList: Array<{ key: string; url: string }>;

  private bgmPlaylist: string[] = []; // bgm列表
  private currentBgmIndex: number = 0; // 当前播放的背景音乐索引
  private isPlaylistMode: boolean = false; // 是否处于列表播放模式
  private currentPlaylistBgmKey: string | null = null; // 当前播放列表BGM

  constructor() {
    this.audioLoader = new THREE.AudioLoader();
    this.audioCache = new Map();
    this.backgroundMusics = new Map();
    this.positionalAudios = new Map();
    this.playingAudios = new Set();
    this.audioList = sceneConfig.audioList;
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.init();
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  private init() {
    this.listener = new THREE.AudioListener();

    for (let item of this.audioList) {
      this.loadAudio(item.key, item.url);
    }
  }

  public async loadAudio(key: string, url: string): Promise<void> {
    if (this.audioCache.has(key)) {
      return;
    }

    try {
      const buffer = await this.audioLoader.loadAsync(url);
      this.audioCache.set(key, buffer);
      console.log(`Audio loaded: ${key}`);
    } catch (error) {
      console.error(`Failed to load audio: ${key}`, error);
    }
  }

  public async playBGM(key: string, config: AudioPlayConfig = {}): Promise<void> {
    if (!this.audioContext || !this.listener) {
      console.warn('AudioManager not initialized');
      return;
    }

    // 可选：停止所有之前的背景音乐
    if (config.stopPrevious) {
      this.stopAllBackgroundMusic({ fadeOut: config.fadeOut ?? 1 });
    }

    if (this.backgroundMusics.has(key)) {
      this.stopBackgroundMusic(key, { fadeOut: 0.1 });
    }

    // 停止当前背景音乐
    // this.stopBackgroundMusic();

    if (!this.audioCache.has(key)) {
      console.log(`音频 ${key} 未加载，等待中...`);
      const audioItem = this.audioList.find((item) => item.key === key);
      if (!audioItem) {
        console.error(`未找到音频配置: ${key}`);
        return;
      }
      await this.loadAudio(key, audioItem.url);
    }

    const buffer = this.audioCache.get(key)!;
    const bgm = new THREE.Audio(this.listener);
    bgm.setBuffer(buffer);
    bgm.setLoop(config.loop ?? true);

    const targetVolume = config.volume ?? 0.5;
    bgm.setVolume(config.fadeIn ? 0 : targetVolume);

    if (config.autoplay ?? true) {
      bgm.play();
      this.playingAudios.add(bgm);
      this.backgroundMusics.set(key, bgm);

      // GSAP 淡入动画
      if (config.fadeIn && config.fadeIn > 0) {
        gsap.to(bgm, {
          volume: targetVolume,
          duration: config.fadeIn,
          ease: 'power1.inOut',
        });
      }
    }

    bgm.onEnded = () => {
      this.playingAudios.delete(bgm);
      this.backgroundMusics.delete(key);
      bgm.disconnect();
    };
  }

  public fadeOutBGM(key: string, duration: number = 1): void {
    const bgm = this.backgroundMusics.get(key);
    if (!bgm) return;

    const volumeProxy = {
      value: bgm.getVolume()
    };
    gsap.to(volumeProxy, {
      value: 0,
      duration,
      ease: 'power1.inOut',
      onUpdate: () => {
      bgm.setVolume(volumeProxy.value);
    },
      onComplete: () => this.stopBackgroundMusic(key),
    });
  }

  public get isPlaying() {
    return this.backgroundMusic;
  }

  public playBgmPlaylist(keys: string[], config: AudioConfig = {}): void {
    if (keys.length === 0) return;

    this.bgmPlaylist = keys;
    this.currentBgmIndex = 0;
    this.isPlaylistMode = true;

    // 播放第一首
    this.playBgmFromPlaylist(config);
  }

  public nextBgm(config: AudioConfig = {}): void {
    if (!this.isPlaylistMode || this.bgmPlaylist.length === 0) return;

    this.currentBgmIndex = (this.currentBgmIndex + 1) % this.bgmPlaylist.length;
    this.playBgmFromPlaylist(config);
  }

  public prevBgm(config: AudioConfig = {}): void {
    if (!this.isPlaylistMode || this.bgmPlaylist.length === 0) return;

    this.currentBgmIndex =
      (this.currentBgmIndex - 1 + this.bgmPlaylist.length) % this.bgmPlaylist.length;
    this.playBgmFromPlaylist(config);
  }

  /**
   * 从播放列表中播放当前索引的背景音乐
   */
  private playBgmFromPlaylist(config: AudioPlayConfig = {}): void {
    const key = this.bgmPlaylist[this.currentBgmIndex];

    // 停止当前音乐
    if (this.currentPlaylistBgmKey) {
      this.stopBackgroundMusic(this.currentPlaylistBgmKey, { fadeOut: config.fadeOut ?? 1 });
    }

    // 播放新音乐
    const buffer = this.audioCache.get(key);
    if (!buffer) {
      console.error(`Audio not found in playlist: ${key}`);
      this.nextBgm(config);
      return;
    }

    const bgm = new THREE.Audio(this.listener!);
    bgm.setBuffer(buffer);
    bgm.setLoop(false);

    const targetVolume = config.volume ?? 0.3;
    bgm.setVolume(config.fadeIn ? 0 : targetVolume);

    bgm.play();
    this.playingAudios.add(bgm);
    this.backgroundMusics.set(key, bgm);
    this.currentPlaylistBgmKey = key;

    // 淡入当前曲
    if (config.fadeIn && config.fadeIn > 0) {
      gsap.to(bgm, {
        volume: targetVolume,
        duration: config.fadeIn,
        ease: 'power1.inOut',
      });
    }

    // 自动播放下一首
    bgm.onEnded = () => {
      this.playingAudios.delete(bgm);
      this.backgroundMusics.delete(key);
      bgm.disconnect();
      this.nextBgm(config);
    };
  }

  // 停止播放列表模式
  public stopPlaylistMode(options: { fadeOut?: number } = {}): void {
    this.isPlaylistMode = false;
    this.bgmPlaylist = [];
    this.currentBgmIndex = 0;
    if (this.currentPlaylistBgmKey) {
      this.stopBackgroundMusic(this.currentPlaylistBgmKey, options);
      this.currentPlaylistBgmKey = null;
    }
  }

  /**
   * 停止全局背景音乐
   */
  public stopBackgroundMusic(key?: string, options: { fadeOut?: number } = {}): void {
    if (key) {
      const bgm = this.backgroundMusics.get(key);
      if (bgm) {
        if (options.fadeOut && options.fadeOut > 0) {
          this.fadeOutBGM(key, options.fadeOut);
          return;
        }
        bgm.stop();
        this.playingAudios.delete(bgm);
        this.backgroundMusics.delete(key);
        bgm.disconnect();
      }
    } else {
      this.stopAllBackgroundMusic(options);
    }
  }

  public stopAllBackgroundMusic(options: { fadeOut?: number } = {}): void {
    this.backgroundMusics.forEach((_, key) => {
      this.stopBackgroundMusic(key, options);
    });
  }

  /**
   * 创建3D空间音频
   * @param key 音频缓存键名
   * @param config 空间音频配置
   * @returns 创建的空间音频实例
   */
  public createPositionalAudio(
    key: string,
    config: PositionalAudioConfig = {}
  ): THREE.PositionalAudio | null {
    if (!this.audioContext || !this.listener) {
      console.warn('AudioManager not initialized');
      return null;
    }

    const buffer = this.audioCache.get(key);
    if (!buffer) {
      console.error(`Audio not found: ${key}`);
      return null;
    }

    // 创建空间音频
    const positionalAudio = new THREE.PositionalAudio(this.listener);
    positionalAudio.setBuffer(buffer);
    positionalAudio.setVolume(config.volume ?? 1.0);
    positionalAudio.setLoop(config.loop ?? false);

    // 设置距离衰减模型
    positionalAudio.setDistanceModel(config.distanceModel ?? 'inverse');
    positionalAudio.setRefDistance(config.refDistance ?? 1.0);
    positionalAudio.setMaxDistance(config.maxDistance ?? 100.0);
    positionalAudio.setRolloffFactor(config.rolloffFactor ?? 1.0);

    // 设置位置
    if (config.position) positionalAudio.position.copy(config.position);
    if (config.object) config.object.add(positionalAudio);

    this.positionalAudios.set(key, positionalAudio);
    return positionalAudio;
  }

  /**
   * 播放3D空间音频
   */
  public playPositionalAudio(key: string, options: PositionalAudioPlayConfig = {}): void {
    const audio = this.positionalAudios.get(key);
    if (!audio) {
      console.error(`Positional audio not found: ${key}`);
      return;
    }

    if (audio.isPlaying) {
      this.stopPositionalAudio(key, { fadeOut: 0.1 });
    }

    if (options.position) audio.position.copy(options.position);

    const targetVolume = options.volume ?? audio.getVolume();
    audio.setVolume(options.fadeIn ? 0 : targetVolume);

    audio.play();
    this.playingAudios.add(audio);

    // 淡入动画
    if (options.fadeIn && options.fadeIn > 0) {
      gsap.to(audio, {
        volume: targetVolume,
        duration: options.fadeIn,
        ease: 'power1.inOut',
      });
    }

    audio.onEnded = () => {
      this.playingAudios.delete(audio);
    };
  }

  /**
   * 停止指定的3D空间音频
   * @param key 音频缓存键名
   */
  public stopPositionalAudio(key: string, options: { fadeOut?: number } = {}): void {
    const audio = this.positionalAudios.get(key);
    if (audio && audio.isPlaying) {
      if (options.fadeOut && options.fadeOut > 0) {
        gsap.to(audio, {
          volume: 0,
          duration: options.fadeOut,
          ease: 'power1.inOut',
          onComplete: () => {
            audio.stop();
            this.playingAudios.delete(audio);
            audio.setVolume(1.0); // 重置音量
          },
        });
        return;
      }
      audio.stop();
      this.playingAudios.delete(audio);
    }
  }

  /**
   * 播放一次性交互音频（非空间）
   * @param key 音频缓存键名
   * @param volume 音量
   */
  public playTempSound(
    key: string,
    options: { volume?: number; fadeIn?: number; fadeOut?: number } = {}
  ): void {
    if (!this.audioContext || !this.listener) {
      console.warn('AudioManager not initialized');
      return;
    }

    const buffer = this.audioCache.get(key);
    if (!buffer) {
      console.error(`Audio not found: ${key}`);
      return;
    }

    // 创建临时音频实例
    const sound = new THREE.Audio(this.listener);
    sound.setBuffer(buffer);
    sound.setVolume(options.fadeIn ? 0 : (options.volume ?? 0.5));
    sound.setLoop(false);

    sound.play();
    this.playingAudios.add(sound);

    if (options.fadeIn && options.fadeIn > 0) {
      gsap.to(sound, {
        volume: options.volume ?? 0.5,
        duration: options.fadeIn,
        ease: 'power1.inOut',
      });
    }

    // 播放结束后自动清理
    sound.onEnded = () => {
      if (options.fadeOut && options.fadeOut > 0) {
        gsap.to(sound, {
          volume: 0,
          duration: options.fadeOut,
          ease: 'power1.inOut',
          onComplete: () => {
            this.playingAudios.delete(sound);
            sound.disconnect();
          },
        });
      } else {
        this.playingAudios.delete(sound);
        sound.disconnect();
      }
    };
  }

  public stopAll(options: { fadeOut?: number } = {}): void {
    this.stopAllBackgroundMusic(options);

    this.positionalAudios.forEach((_, key) => {
      this.stopPositionalAudio(key, options);
    });

    this.playingAudios.forEach((audio) => {
      if (options.fadeOut && options.fadeOut > 0) {
        gsap.to(audio, {
          volume: 0,
          duration: options.fadeOut,
          ease: 'power1.inOut',
          onComplete: () => {
            audio.stop();
            audio.disconnect();
          },
        });
      } else {
        audio.stop();
        audio.disconnect();
      }
    });

    this.playingAudios.clear();
  }

  public dispose(): void {
    this.stopAll();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.listener) {
      this.listener = null;
    }

    this.listener = null;
    this.audioCache.clear();
    this.positionalAudios.clear();
    this.backgroundMusics.clear();
    AudioManager.instance = null as any;
  }
}
