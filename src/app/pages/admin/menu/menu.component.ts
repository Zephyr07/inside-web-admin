import { Component, OnInit } from '@angular/core';
import {AuthProvider} from "../../../providers/auth/auth";
import {Router} from "@angular/router";

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit {
  public user:any;
  constructor(
    private auth: AuthProvider,
    private router: Router,
  ) {
    this.auth.getContext().then((d:any)=>{
      this.user = d;
    }, (e:any)=>{
      this.router.navigate(['/login']);
    })
  }

  ngOnInit(): void {
  }

  logout(){
    this.auth.logout().then(()=>{
      this.router.navigate(['/login']);
    })
  }

}
