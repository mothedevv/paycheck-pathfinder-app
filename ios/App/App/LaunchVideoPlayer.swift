import UIKit
import AVFoundation

final class LaunchVideoPlayer: NSObject {

    private var player: AVPlayer?
    private var playerLayer: AVPlayerLayer?
    private var containerView: UIView?
    private var onFinish: (() -> Void)?

    private var posterView: UIImageView?
    private var playerItem: AVPlayerItem?

    func play(over window: UIWindow?,
              videoName: String,
              videoExt: String = "mp4",
              mute: Bool = true,
              onFinish: @escaping () -> Void) {

        guard let window else { onFinish(); return }
        guard let url = Bundle.main.url(forResource: videoName, withExtension: videoExt) else {
            print("LaunchVideoPlayer: video not found in bundle: \(videoName).\(videoExt)")
            onFinish()
            return
        }

        self.onFinish = onFinish

        // 1) Fullscreen overlay (instant)
        let view = UIView(frame: window.bounds)
        view.backgroundColor = .black
        view.isUserInteractionEnabled = false
        window.addSubview(view)
        self.containerView = view

        // 2) Poster image shows immediately (must exist in Assets.xcassets)
        let poster = UIImageView(frame: view.bounds)
        poster.contentMode = .scaleAspectFill
        poster.image = UIImage(named: "SplashPoster")
        poster.alpha = 1.0
        view.addSubview(poster)
        self.posterView = poster

        // 3) Player item + readiness observer
        let item = AVPlayerItem(url: url)
        self.playerItem = item
        item.addObserver(self, forKeyPath: "status", options: [.new, .initial], context: nil)

        // 4) Player + layer (insert BEHIND poster)
        let player = AVPlayer(playerItem: item)
        player.isMuted = mute
        player.actionAtItemEnd = .pause
        self.player = player

        let layer = AVPlayerLayer(player: player)
        layer.frame = view.bounds
        layer.videoGravity = .resizeAspectFill
        view.layer.insertSublayer(layer, below: poster.layer)
        self.playerLayer = layer

        // 5) Finish observer
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(videoDidFinish),
            name: .AVPlayerItemDidPlayToEndTime,
            object: item
        )

        // 6) Start
        player.play()
    }

    override func observeValue(forKeyPath keyPath: String?,
                               of object: Any?,
                               change: [NSKeyValueChangeKey : Any]?,
                               context: UnsafeMutableRawPointer?) {

        guard keyPath == "status",
              let item = object as? AVPlayerItem else { return }

        if item.status == .readyToPlay {
            DispatchQueue.main.async {
                UIView.animate(withDuration: 0.12, animations: {
                    self.posterView?.alpha = 0
                }, completion: { _ in
                    self.posterView?.removeFromSuperview()
                    self.posterView = nil
                })
            }
        }
    }

    @objc private func videoDidFinish() {
        // Optional fade-out of the whole overlay
        if let view = containerView {
            UIView.animate(withDuration: 0.18, animations: {
                view.alpha = 0
            }, completion: { _ in
                self.cleanup()
                self.onFinish?()
                self.onFinish = nil
            })
        } else {
            cleanup()
            onFinish?()
            onFinish = nil
        }
    }

    func cleanup() {
        NotificationCenter.default.removeObserver(self)

        if let item = playerItem {
            item.removeObserver(self, forKeyPath: "status")
        }
        playerItem = nil

        player?.pause()
        player = nil

        playerLayer?.removeFromSuperlayer()
        playerLayer = nil

        posterView?.removeFromSuperview()
        posterView = nil

        containerView?.removeFromSuperview()
        containerView = nil
    }
}
