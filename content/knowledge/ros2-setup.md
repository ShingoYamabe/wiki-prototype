+++
title = "ROS 2 セットアップガイド"
description = "Ubuntu 22.04 上への ROS 2 Humble のインストールと初期設定の手順。"
date = 2026-04-16
updated = 2026-04-16
authors = ["SCR Lab Staff"]
tags = ["ros2", "Ubuntu", "環境構築"]
category = "knowledge"
draft = false
weight = 3

[extra]
related = ["onboarding/environment-setup", "projects/rover-2025"]
+++

# ROS 2 セットアップガイド

ROS 2 Humble Hawksbill を Ubuntu 22.04 LTS にインストールする手順です。

## 前提条件

- Ubuntu 22.04 LTS（デスクトップまたはサーバ）
- インターネット接続
- `sudo` 権限

## インストール手順

### 1. ロケールの設定

```bash
locale  # UTF-8 の確認
sudo apt update && sudo apt install locales
sudo locale-gen en_US en_US.UTF-8
sudo update-locale LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8
export LANG=en_US.UTF-8
```

### 2. ROS 2 apt リポジトリの追加

```bash
sudo apt install software-properties-common
sudo add-apt-repository universe

sudo apt update && sudo apt install curl -y
sudo curl -sSL https://raw.githubusercontent.com/ros/rosdistro/master/ros.key \
  -o /usr/share/keyrings/ros-archive-keyring.gpg

echo "deb [arch=$(dpkg --print-architecture) \
  signed-by=/usr/share/keyrings/ros-archive-keyring.gpg] \
  http://packages.ros.org/ros2/ubuntu \
  $(. /etc/os-release && echo $UBUNTU_CODENAME) main" \
  | sudo tee /etc/apt/sources.list.d/ros2.list > /dev/null
```

### 3. ROS 2 Humble のインストール

```bash
sudo apt update
sudo apt upgrade

# デスクトップ版（GUI ツール含む）
sudo apt install ros-humble-desktop

# または最小構成
# sudo apt install ros-humble-ros-base
```

### 4. 環境設定

```bash
# .bashrc に追記
echo "source /opt/ros/humble/setup.bash" >> ~/.bashrc
source ~/.bashrc
```

### 5. 動作確認

ターミナル 1:

```bash
ros2 run demo_nodes_cpp talker
```

ターミナル 2:

```bash
ros2 run demo_nodes_py listener
```

`Hello World: 1`, `Hello World: 2`, ... と表示されれば成功です。

## よく使うコマンド

| コマンド | 説明 |
|---|---|
| `ros2 topic list` | 現在のトピック一覧 |
| `ros2 topic echo /topic_name` | トピックの内容を確認 |
| `ros2 node list` | 実行中のノード一覧 |
| `ros2 run <pkg> <node>` | ノードを起動 |
| `ros2 launch <pkg> <launch_file>` | launch ファイルを実行 |
| `colcon build` | ワークスペースをビルド |

## トラブルシューティング

{% callout(type="warning", title="colcon build が失敗する場合") %}
`rosdep` が未インストールの場合があります：

```bash
sudo apt install python3-rosdep
sudo rosdep init
rosdep update
rosdep install --from-paths src --ignore-src -r -y
```
{% end %}

{% callout(type="info", title="ROS_DOMAIN_ID について") %}
同一ネットワーク上の複数の ROS 2 環境が干渉する場合は `ROS_DOMAIN_ID` を設定します：

```bash
export ROS_DOMAIN_ID=42  # 0〜101 の任意の値
```
{% end %}
