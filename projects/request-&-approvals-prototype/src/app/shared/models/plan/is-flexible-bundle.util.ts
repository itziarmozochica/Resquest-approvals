import { BundleInformation } from './plan.model';

export function isFlexibleBundle(
  bundleInformation: BundleInformation | undefined,
): bundleInformation is BundleInformation & { flow: 'flexible' } {
  return bundleInformation?.flow === 'flexible';
}
