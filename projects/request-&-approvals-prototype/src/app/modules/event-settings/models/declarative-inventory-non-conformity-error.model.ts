export class DeclarativeInventoryNonConformityError extends Error {
  constructor() {
    super('The declarative inventory change was rejected by non-conformities');
    this.name = 'DeclarativeInventoryNonConformityError';
  }
}
