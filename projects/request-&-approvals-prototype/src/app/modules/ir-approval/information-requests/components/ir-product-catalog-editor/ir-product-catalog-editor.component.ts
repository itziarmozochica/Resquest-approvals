import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { currencySymbol, productTierPriceViolation } from '../../models/event-schedule-composer-v1.helpers';
import { ProductRow } from '../../models/event-schedule-composer-v1.model';
import { buildProductControl, productsFromControl, type IrProductFormArray } from '../../models/ir-answers-form.util';
import { ProductTaxRateOption } from '../../services/venue-pricing.service';

type ProductField = 'capacity' | 'name' | 'pricing';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  selector: 'app-ir-product-catalog-editor',
  standalone: true,
  styleUrls: ['./ir-product-catalog-editor.component.scss'],
  templateUrl: './ir-product-catalog-editor.component.html',
})
export class IrProductCatalogEditorComponent {
  readonly form = input<IrProductFormArray | null>(null);
  readonly value = input<ProductRow[]>([]);
  readonly validationAttempted = input<boolean>(false);
  readonly readOnly = input<boolean>(false);

  readonly currency = input<string>('');
  readonly mustUseTaxBase = input<boolean>(false);
  readonly productTaxRates = input<ProductTaxRateOption[]>([]);

  readonly valueChange = output<ProductRow[]>();

  readonly currencyPrefix = computed<string>(() => currencySymbol(this.currency()));
  readonly priceLabelKey = computed<string>(() =>
    this.mustUseTaxBase()
      ? 'informationRequests.schedule.tickets.standardPriceTaxBase'
      : 'informationRequests.schedule.tickets.standardPrice',
  );
  readonly defaultProductType = computed<string>(() => {
    const options = this.productTaxRates();
    return options.find(option => option.productType === 'admission_ticket')?.productType ?? options[0]?.productType ?? '';
  });

  readonly demandBands: { category: 'peak' | 'valley'; labelKey: string; errorKey: string }[] = [
    {
      category: 'peak',
      labelKey: 'informationRequests.schedule.tickets.peak',
      errorKey: 'informationRequests.schedule.tickets.peakAboveStandard',
    },
    {
      category: 'valley',
      labelKey: 'informationRequests.schedule.tickets.valley',
      errorKey: 'informationRequests.schedule.tickets.valleyBelowStandard',
    },
  ];

  #placeholderRow: ProductRow | null = null;

  products(): ProductRow[] {
    const form = this.form();
    const products = form ? productsFromControl(form) : (this.value() ?? []);
    const rows = products.map((p, i) => ({
      capacity: String(p.capacity ?? ''),
      id: String(p.id ?? `p-${i}`),
      name: String(p.name ?? ''),
      pricing: String(p.pricing ?? ''),
      productType: String(p.productType ?? ''),
      subcategories: Array.isArray(p.subcategories) ? p.subcategories : [],
    }));
    if (rows.length) {
      this.#placeholderRow = null;
      return rows;
    }
    // Stable placeholder: a fresh random id per change-detection pass would remount the tracked row.
    this.#placeholderRow ??= this.#emptyProductRow();
    return [this.#placeholderRow];
  }

  addProduct(): void {
    this.#emit([...this.products(), this.#emptyProductRow()]);
  }

  addSubcategory(index: number, category: 'peak' | 'valley'): void {
    const next = this.products().map((p, i) => {
      if (i !== index) return p;
      const subcategories = [...(p.subcategories ?? [])];
      if (subcategories.some(s => s.category === category)) return p;
      subcategories.push({
        category,
        id: `${p.id || `p-${index}`}-${category}`,
        name: category === 'peak' ? 'Peak' : 'Valley',
        pricing: '',
      });
      return { ...p, subcategories };
    });
    this.#emit(next);
  }

  removeProduct(index: number): void {
    this.#emit(this.products().filter((_, i) => i !== index));
  }

  removeSubcategory(index: number, category: 'peak' | 'valley'): void {
    const next = this.products().map((p, i) =>
      i === index ? { ...p, subcategories: (p.subcategories ?? []).filter(s => s.category !== category) } : p,
    );
    this.#emit(next);
  }

  productsMissing(): boolean {
    return this.validationAttempted() && this.products().every(product => !this.#productTouched(product));
  }

  productFieldInvalid(index: number, field: ProductField): boolean {
    if (!this.validationAttempted()) return false;
    const product = this.products()[index];
    if (!product || !this.#productTouched(product)) return false;
    return !String(product[field] ?? '').trim();
  }

  setProductField(index: number, field: ProductField, value: string): void {
    const next = this.products().map((p, i) => (i === index ? { ...p, [field]: value } : p));
    this.#emit(next);
  }

  setProductType(index: number, productType: string): void {
    const next = this.products().map((p, i) => (i === index ? { ...p, productType } : p));
    this.#emit(next);
  }

  setSubcategoryPricing(index: number, category: 'peak' | 'valley', pricing: string): void {
    const next = this.products().map((p, i) => {
      if (i !== index) return p;
      return {
        ...p,
        subcategories: (p.subcategories ?? []).map(s => (s.category === category ? { ...s, pricing } : s)),
      };
    });
    this.#emit(next);
  }

  effectiveProductType(product: ProductRow): string {
    return String(product.productType ?? '').trim() || this.defaultProductType();
  }

  optionLabel(option: ProductTaxRateOption): string {
    return option.humanizedProductType;
  }

  subcategory(index: number, category: 'peak' | 'valley') {
    return this.products()[index]?.subcategories?.find(s => s.category === category) ?? null;
  }

  subcategoryInvalid(index: number, category: 'peak' | 'valley'): boolean {
    if (!this.validationAttempted()) return false;
    const subcategory = this.subcategory(index, category);
    return !!subcategory && !String(subcategory.pricing ?? '').trim();
  }

  /** Whether the product's Peak/Valley price breaks the ordering rule (peak ≤ standard, or valley ≥ standard). */
  bandPriceViolation(index: number, category: 'peak' | 'valley'): boolean {
    const product = this.products()[index];
    return !!product && productTierPriceViolation(product)[category];
  }

  #emit(products: ProductRow[]): void {
    if (this.readOnly()) return;
    const next = products.map(product => this.#withResolvedTax(product));
    const form = this.form();
    if (form) {
      this.#replaceProducts(form, next);
    }
    this.valueChange.emit(next);
  }

  #withResolvedTax(product: ProductRow): ProductRow {
    return { ...product, productType: this.effectiveProductType(product) };
  }

  #emptyProductRow(): ProductRow {
    return { capacity: '', id: this.#newProductId(), name: '', pricing: '', productType: '', subcategories: [] };
  }

  /** Collision-proof id for a new product row (crypto UUID, with a random fallback). */
  #newProductId(): string {
    const c = globalThis.crypto as { randomUUID?: () => string } | undefined;
    return `p-${c?.randomUUID ? c.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10)}`;
  }

  #productTouched(product: ProductRow): boolean {
    if ([product.name, product.capacity, product.pricing].some(value => String(value ?? '').trim())) return true;
    return (product.subcategories ?? []).some(subcategory => String(subcategory.pricing ?? '').trim());
  }

  #replaceProducts(form: IrProductFormArray, products: ProductRow[]): void {
    form.clear();
    products.forEach(product => form.push(buildProductControl(product)));
    form.markAsDirty();
    form.updateValueAndValidity();
  }
}
