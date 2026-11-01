Pod::Spec.new do |s|
  s.name           = 'ApplePayButton'
  s.version        = '1.0.0'
  s.summary        = "Apple's PKPaymentButton for the KSP Electronics app"
  s.author         = 'KSP Electronics'
  s.homepage       = 'https://kspelectronics.in'
  s.license        = 'UNLICENSED'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks     = 'PassKit'
  s.source_files   = '**/*.swift'
end
