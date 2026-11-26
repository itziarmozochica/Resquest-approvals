export interface TemplateCouponAdvancedSelectionFilterDTO {
  filter_id: string;
  filter_value: {
    start_date: string;
    end_date: string;
    days_a_week: Array<string>;
    start_time_slot: string;
    end_time_slot: string;
  };
}
