+++
title = "Rover 2025 プロジェクト"
description = "2025年度の自律移動ロボット（Rover）開発プロジェクトの概要・進捗・設計記録。"
date = 2026-04-16
updated = 2026-04-16
authors = ["SCR Lab Staff"]
tags = ["ロボット", "ROS2", "自律移動", "2025"]
category = "projects"
draft = false
weight = 1

[extra]
related = ["research/overview", "knowledge/git-workflow"]
+++

# **これはUXイメージを想像しやすくするためにAIに作成してもらったMOCKページです**
# Rover 2025 プロジェクト

## プロジェクト概要

| 項目 | 内容 |
|---|---|
| 目標 | 屋内環境での完全自律ナビゲーション実証 |
| 期間 | 2025年4月 〜 2026年3月 |
| メンバー | 4名 |
| 使用 OS/FW | Ubuntu 22.04 / ROS 2 Humble |

## マイルストーン

- [x] ハードウェア選定・組み立て（2025/06）
- [x] ROS 2 環境構築・基本動作確認（2025/07）
- [ ] SLAM マップ生成（2025/09）
- [ ] Nav2 による自律ナビゲーション（2025/11）
- [ ] 実環境デモ（2026/02）

## システム構成

```
┌─────────────┐    USB     ┌──────────────┐
│  Raspberry  │◄──────────►│  Arduino     │
│  Pi 5       │            │  (Motor Ctrl)│
└──────┬──────┘            └──────────────┘
       │ Ethernet
┌──────▼──────┐
│  開発PC      │
│  (ROS 2     │
│   Navigation│
│   Stack)    │
└─────────────┘
```

## 技術メモ

{% callout(type="info", title="LIDAR 設定") %}
使用センサ: RPLiDAR A2M12  
ドライバ: `ros2 launch rplidar_ros rplidar_a2m12_launch.py`
{% end %}

{% callout(type="warning", title="モータードライバ注意") %}
電源投入順序: バッテリー → モータードライバ → Raspberry Pi の順で行うこと。
逆順にすると電圧スパイクでモータードライバが損傷する可能性があります。
{% end %}
