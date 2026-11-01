import ExpoModulesCore
import PassKit

// Apple's own Apple Pay button (PKPaymentButton), as a view the app can place. Apple requires this exact button: a look-alike gets the app rejected.
public class ApplePayButtonModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ApplePayButton")
    View(ApplePayButtonView.self) {
      Events("onPress")
    }
  }
}

class ApplePayButtonView: ExpoView {
  let onPress = EventDispatcher()
  private let button: PKPaymentButton

  required init(appContext: AppContext? = nil) {
    if #available(iOS 14.0, *) {
      button = PKPaymentButton(paymentButtonType: .buy, paymentButtonStyle: .automatic) // follows light and dark mode
    } else {
      button = PKPaymentButton(paymentButtonType: .buy, paymentButtonStyle: .black)
    }
    super.init(appContext: appContext)
    button.addTarget(self, action: #selector(tapped), for: .touchUpInside)
    addSubview(button)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    button.frame = bounds
  }

  @objc private func tapped() {
    onPress()
  }
}
