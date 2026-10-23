"use client";

/**
 * A device-page error beside the controls, on LiveDevice and on Join.
 * Not the mist card: the page is still up. Nothing retries the action.
 */
export interface DeviceErrorBannerModel {
  code: string;
  message: string;
}

export const liveDeviceBanner = (error: {
  code: string;
  message: string;
}): DeviceErrorBannerModel => ({
  code: error.code,
  message: error.message,
});

export function DeviceErrorBanner({ code, message }: DeviceErrorBannerModel) {
  return (
    <div
      className="bt-device-banner"
      role="alert"
      data-presentation="banner"
      data-error-code={code}
    >
      <p className="bt-kicker">Something went wrong</p>
      <p>{message}</p>
      <p className="bt-device-banner-code">{code}</p>
    </div>
  );
}
