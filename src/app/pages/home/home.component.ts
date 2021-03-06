import {Component, OnInit} from '@angular/core';
import {ApiProvider} from "../../providers/api/api";
import * as _ from "lodash";
import {ModalDismissReasons, NgbModal} from "@ng-bootstrap/ng-bootstrap";
import {DomSanitizer} from "@angular/platform-browser";

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  public user :any;
  page = 1;
  max_length = 0;
  old_max_length = 0;
  last_page = 10000000;
  public detail : any;
  public news : any;
  public state = "description";
  public ceo :any = [];
  public post :any = [];
  public posts :any = [];
  public show_more_post = false;
  public show_post = true;
  public anniv :any = [];
  public show_anniv = true;
  public group :any = [];
  public show_group = true;
  public events :any = [];
  public note_group :any = [];
  public note :any = [];
  public show_note = true;
  public entity = "";
  public show = false;
  public imageSrc ="";
  public closeResult ="";
  public content ="";
  public search_text ="";
  private file_selected = false;
  public image = new FormData();
  constructor(
    private modalService: NgbModal,
    private sanitizer: DomSanitizer,
    private api : ApiProvider
  ) {
    // @ts-ignore
    this.user = JSON.parse(localStorage.getItem('user'));
    this.getBirthday();
    this.getGroup();
    this.getNote();
    this.getCeoMessage();
    this.getPosts(true);
  }

  ngOnInit(): void {
  }

  getCeoMessage(){
    this.api.Contents.getList({type:'ceo'}).subscribe((v:any)=>{
      this.ceo = v[0];
    })
  }
  getBirthday(){
    const opt = {
      should_paginate: false,
      'birthday-lk':'-09-'
    };
    this.api.Employees.getList(opt).subscribe((e:any)=>{
      e.forEach((v:any)=>{
        v.anniv = v.birthday.split('-')[2];
      });
      e = _.orderBy(e,'anniv');
      this.anniv = e;
      this.show_anniv = false;
    }, (e:any)=>{
      console.log(e);
    })
  }

  getGroup(){
    const opt = {
      should_paginate: false,
      employee_id : this.user.employee.id,
      profile: 'owner',
      _includes:'group.members.employee'
    };
    this.api.Members.getList(opt).subscribe((d:any)=>{
      this.group = d;
      this.show_group = false;
    }, (e:any)=>{
      console.log(e);
    })
  }
  
  getNote(){
    // recuperation de l'entiti?? de l'employ??
    this.api.Managements.get(this.user.employee.direction_id,{_includes:'entity'}).subscribe((a:any)=>{
      // recuperation des notes de l'entiti?? d'appartenance
      this.entity = "de "+a.body.entity.name;
      let opt = {
        per_page:10,
        _sort:'date',
        _sortDir:'desc',
        entity_id: a.body.entity_id,
        _includes: 'newsletter'
      };
      this.api.NewsletterEntities.getList(opt).subscribe((d:any)=>{
        d.forEach((v:any)=>{
          console.log(v.newsletter.type);
          if(v.newsletter.type == 'event'){
            this.events.push(v);
          } else {
            this.note.push(v);
          }
        });
        this.events = _.orderBy(this.events,'date').reverse();
        this.note = _.orderBy(this.note,'date').reverse();
        this.show_note = false;
      }, (e:any)=>{
        console.log(e);
      })
    }, (e:any)=>{
      console.log(e);
    });
  }

  getPosts(s:boolean){
    if(s){
      // premi??re requ??te
      this.page = 1;
    } else {
      this.show_more_post = true;
    }
    if(this.page <= this.last_page){
      const opt = {
        per_page:10,
        'post_id-nl':true,
        _sort:'created_at',
        _sortDir:'desc',
        _includes:'employee,posts.employee,ratings',
        page: this.page
      };
      this.api.Posts.getList(opt).subscribe((p:any)=>{
        this.last_page = p.metadata.last_page;
        this.max_length = p.metadata.total;
        this.old_max_length = this.max_length;
        p.forEach((v:any)=>{
          if(v.post_id==undefined || v.post_id==null){
            v.posts = _.orderBy(v.posts, 'updated_at').reverse();
            v.comment = _.filter(p,{post_id:v.id}).length;
            p.commentaire = "";
            v.like = _.find(v.ratings, {employee_id: this.user.employee.id}) != undefined;
            v.show = false;
            this.posts.push(v);
          }
        });
        this.posts = _.orderBy(this.posts, 'updated_at').reverse();
        this.show_more_post = false;
        this.show_post = false;
        this.page++;
      })
    } else {
      this.show_more_post = false;
    }

  }

  savePost(){
    this.show = true;
    this.api.Posts.post({content:this.content,employee_id:this.user.employee.id}).subscribe((e:any)=>{
      // enretistrement de l'image
      if(this.file_selected){
        this.image.append('_method', 'PUT');
        this.api.restangular.all('posts/' + e.body.id).customPOST(this.image, undefined, undefined, {'Content-Type': undefined}).subscribe((d:any) => {
          //console.log('ok', d);
          alert("Publi??");
          this.show = false;
          this.content = "";
          this.imageSrc = "";
          this.image = new FormData();
        }, (e:any)=>{
          console.log(e);
          this.show = false;
        });
      } else {
        // pas d'image on ne fait rien
        this.show = false;
      }
    })
  }

  saveComment(p:any){
    p.show = true;
    const opt = {
      content : p.commentaire,
      employee_id: this.user.employee.id,
      post_id: p.id
    };
    this.api.Posts.post(opt).subscribe((d:any)=>{
      d.body.employee = this.user.employee;
      p.posts.push(d.body);
      p.posts = _.orderBy(p.posts,'updated_at').reverse();
      p.commentaire = "";
      p.show = false;
    }, (e:any)=>{
      console.log(e);
      p.show = false;
    })

  }

  deleteComment(post:any,p:any){
    const x = _.find(post.posts,p);
    post.posts.splice(post.posts.indexOf(x),1);
    this.api.Posts.get(p.id).subscribe((e:any)=>{
      e.id = e.body.id;
      e.remove();
    }, (e:any)=>{
      console.log(e);
      p.show = false;
    })
  };

  saveRating(p:any){
    if(!p.like){
      // ajout
      p.like = true;
      p.ratings.push({id:0,employee_id:this.user.employee.id,post_id:p.id});
      this.api.Ratings.post({employee_id:this.user.employee.id,post_id:p.id}).subscribe((d:any)=>{

      }, (e:any)=>{
        console.log(e);
      })
    } else {
      p.like = false;
      const x = _.find(p.ratings,{employee_id:this.user.employee.id,post_id:p.id});
      p.ratings.splice(p.ratings.indexOf(x),1);
      //suppression
      this.api.Ratings.getList({employee_id:this.user.employee.id,post_id:p.id}).subscribe((v:any)=>{
        v[0].remove().subscribe(()=>{
        }, (e:any)=>{
          console.log(e);
        } )
      })
    }
  }

  onSelectFile(event:any) {
    this.file_selected = true;
    const reader = new FileReader();
    reader.readAsDataURL(event.target.files[0]);
    //this.imageSrc = reader.result as string;
    this.image.append('image', event.target.files[0], event.target.files[0].name);
    reader.onload = () => {
      this.imageSrc = reader.result as string;
    };
  }

  openModal(){
    // @ts-ignore
    document.getElementById('btnModal').click();
  }

  openEvent(n:any){
    this.detail = n;
    // @ts-ignore
    document.getElementById('btnModalEvent').click();
  }

  openGroup(n:any){
    this.detail = n;
    // recup??ration des notes du groupe d'appartenance
    let opt = {
      should_paginate: false,
      _sort:'updated_at',
      group_id: n.group.id,
      _includes: 'newsletter'
    };
    this.api.NewsletterGroups.getList(opt).subscribe((e:any)=>{
      this.note_group = e;
    }, (e:any)=>{
      console.log(e);
    });
    // @ts-ignore
    document.getElementById('btnModalGroup').click();
  }

  openNote(n:any){
    this.detail = n;
    this.detail.fichier = this.sanitizer.bypassSecurityTrustResourceUrl(n.newsletter.file);
    // @ts-ignore
    document.getElementById('btnModalNote').click();
  }

  openModal2(n:any){
    this.news = n;
    this.news.fichier = this.sanitizer.bypassSecurityTrustResourceUrl(n.newsletter.file);
    // @ts-ignore
    document.getElementById('btnModal2').click();
  }

  open(content:any) {
    this.modalService.open(content, {centered: true,scrollable: true,size: 'xl'}).result.then((result) => {
      this.closeResult = `Closed with: ${result}`;
    }, (reason) => {
      this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
    });
  }

  private getDismissReason(reason: any): string {
    if (reason === ModalDismissReasons.ESC) {
      return 'by pressing ESC';
    } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return 'by clicking on a backdrop';
    } else {
      return `with: ${reason}`;
    }
  }
}
