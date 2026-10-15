import { Component, NO_ERRORS_SCHEMA, OnInit, signal } from '@angular/core';

@Component({
    selector: 'app-page1',
    templateUrl: './component.html',
    schemas: [NO_ERRORS_SCHEMA]
})
export class Page1Component implements OnInit {
    value = signal(0)
    constructor() {}

    ngOnInit(): void { }
    add() {
        this.value.update((a) => a + 1)
    }
}
