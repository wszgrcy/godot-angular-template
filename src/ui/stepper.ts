import { Component, NO_ERRORS_SCHEMA, computed, forwardRef } from "@angular/core";
import { NG_VALUE_ACCESSOR } from "@angular/forms";
import { GodotControlBase } from "godot-angular/forms";
import { Control } from "godot";

/**
 * 自定义复合控件接进 Angular Forms。
 *
 * 继承 GodotControlBase：registerOnChange / registerOnTouched / setDisabledState 由基类实现，
 * 组件只负责「用户改了什么」。值放在 signal 上而不是 Godot 属性上，所以不必覆写 writeValue。
 */
@Component({
  selector: "app-stepper",
  standalone: true,
  schemas: [NO_ERRORS_SCHEMA],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => AppStepper), multi: true }],
  template: `
    <HBoxContainer class="field-row">
      <Button text="−" class="sm" [disabled]="disabled$()" (pressed)="step(-1)"></Button>
      <PanelContainer class="stepper-value">
        <Label class="strong center" [text]="display()" [size_flags_horizontal]="expand"></Label>
      </PanelContainer>
      <Button text="+" class="sm" [disabled]="disabled$()" (pressed)="step(1)"></Button>
    </HBoxContainer>
  `,
})
export class AppStepper extends GodotControlBase<number> {
  readonly expand = Control.SizeFlags.SIZE_EXPAND_FILL;

  protected override emptyValue(): number {
    return 0;
  }

  readonly display = computed(() => String(this.value$()));

  step(delta: number): void {
    this.valueAndTouchedChange(this.value$() + delta);
  }
}
