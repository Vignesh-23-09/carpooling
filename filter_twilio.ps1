if Test-Path 'smartride/src/main/resources/application.properties' {
  (Get-Content 'smartride/src/main/resources/application.properties') -notmatch '^twilio\.' -notmatch '^# .* Twilio' | Set-Content 'smartride/src/main/resources/application.properties'
}
