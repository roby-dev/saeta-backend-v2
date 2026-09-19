export class GetTypesQuery {
  constructor(
    public readonly skip?: number,
    public readonly limit?: number,
  ) {}
}
