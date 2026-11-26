export class ScrollUtils {
  static scrollToTop() {
    setTimeout(() => {
      window.scrollTo({ behavior: 'smooth', top: 0 });
    });
  }
}
