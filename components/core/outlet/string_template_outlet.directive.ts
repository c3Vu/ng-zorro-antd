/**
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/NG-ZORRO/ng-zorro-antd/blob/master/LICENSE
 */

import {
  ComponentFactoryResolver,
  ComponentRef,
  Directive,
  EmbeddedViewRef,
  InjectionToken,
  Injector,
  Input,
  OnChanges,
  SimpleChanges,
  TemplateRef,
  Type,
  ViewContainerRef
} from '@angular/core';
import { NzSafeAny } from 'ng-zorro-antd/core/types';

@Directive({
  selector: '[nzStringTemplateOutlet]',
  exportAs: 'nzStringTemplateOutlet'
})
export class NzStringTemplateOutletDirective<T> implements OnChanges {
  @Input('nzStringTemplateOutletContext') context?: T;
  @Input('nzStringTemplateOutlet') content: NzSafeAny = '';

  componentRef?: ComponentRef<unknown>;
  templateViewRef?: EmbeddedViewRef<T>;

  constructor(private viewContainerRef: ViewContainerRef, private templateRef: TemplateRef<NzSafeAny>, private injector: Injector) {}

  private updateContext(): void {
    const newCtx = this.getContext();
    const oldCtx = this.templateViewRef?.context || {};
    if (newCtx) {
      Object.keys(oldCtx).forEach(propName => {
        delete oldCtx[propName as keyof {}];
      });
      Object.keys(newCtx).forEach(propName => {
        oldCtx[propName as keyof {}] = newCtx[propName as keyof {}];
      });
    }
  }

  ngOnChanges({ content }: SimpleChanges): void {
    // avoid recreating when only context is changed
    if (!content) {
      if (isComponent(this.content) && this.componentRef) {
        // the injected context of the component is already bound with the context
        return;
      } else if (isTemplate(this.content) && this.templateViewRef) {
        this.updateContext();
        return;
      }
    } else if (
      !content?.firstChange &&
      this.templateViewRef &&
      (isFunction(this.content) || isOtherType(this.content)) &&
      (isFunction(content.previousValue) || isOtherType(content.previousValue))
    ) {
      this.updateContext();
      return;
    }
    this.viewContainerRef.clear();
    if (isComponent(this.content)) {
      this.createComponentOutlet();
    } else {
      this.createTemplateOutlet();
    }
  }

  createComponentOutlet(): void {
    const context = this.context || {};
    const injector = Injector.create({
      parent: this.injector,
      providers: [
        {
          provide: NZ_OUTLET_CONTEXT,
          useValue: new Proxy(context, {
            get: (_, key) => context[key as keyof {}]
          })
        }
      ]
    });
    const factory = injector.get(ComponentFactoryResolver).resolveComponentFactory((this.content as NzComponentOutlet<T>).component);
    this.componentRef = this.viewContainerRef.createComponent(factory, 0, injector);
  }

  createTemplateOutlet(): void {
    this.templateViewRef = this.viewContainerRef.createEmbeddedView(this.getTemplate(), this.getContext());
  }

  getTemplate(): TemplateRef<NzSafeAny> {
    if (isTemplate(this.content)) {
      return this.content;
    } else {
      return this.templateRef;
    }
  }

  getContext(): {} {
    if (isTemplate(this.content)) {
      return this.context || {};
    } else if (isFunction(this.content)) {
      const val = this.content(this.context as T);
      return {
        $implicit: val,
        nzStringTemplateOutlet: val
      };
    } else {
      return {
        $implicit: this.content,
        nzStringTemplateOutlet: this.content
      };
    }
  }
}
export class NzStringTemplateOutletContext {
  public $implicit: NzSafeAny;
}
export class NzComponentOutlet<T> {
  component: Type<T>;
  constructor(component: Type<T>) {
    this.component = component;
  }
}

function isTemplate(obj: NzSafeAny): obj is TemplateRef<NzSafeAny> {
  return obj instanceof TemplateRef;
}

function isComponent(obj: NzSafeAny): obj is NzComponentOutlet<NzSafeAny> {
  return obj instanceof NzComponentOutlet;
}

function isFunction(obj: NzSafeAny): obj is (context: NzSafeAny) => NzSafeAny {
  return typeof obj === 'function';
}

function isOtherType(obj: NzSafeAny): boolean {
  return !isTemplate(obj) && !isComponent(obj) && !isFunction(obj);
}

export const NZ_OUTLET_CONTEXT = new InjectionToken<object>('Context From NzStringTemplateOutlet');
