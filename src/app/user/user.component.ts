import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticationService } from '../service/authentication.service';
import { UserService } from '../service/user.service';
import { NotificationService } from '../service/notification.service';
import { User } from '../model/user';
import { BehaviorSubject, Subscription } from 'rxjs';
import { FileUploadStatus } from '../model/file-upload.status';
import { NotificationType } from '../enum/notification-type.enum';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css']
})
export class UserComponent implements OnInit, OnDestroy {

  private titleSubject = new BehaviorSubject<string>('Users');
  public titleAction$ = this.titleSubject.asObservable();

  public users: User[] | undefined;
  public user: User | undefined;

  public refreshing: boolean | undefined;
  public selectedUser: User | undefined;
  public fileName: string | undefined;
  public profileImage: File | undefined;
  private subscriptions: Subscription[] = [];
  public editUser = new User();
  private currentUsername: string | undefined;
  public fileStatus = new FileUploadStatus();

  constructor(
    private router: Router,
    private authenticationService: AuthenticationService,
    private userService: UserService,
    private notificationService: NotificationService
  ) { }



  ngOnInit(): void {
    this.user = this.authenticationService.getUserFromLocalCache();
    this.getUsers(true);
  }


  public changeTitle(title: string): void {
    this.titleSubject.next(title);
  }

  // public getUsers(showNotification: boolean): void {
  //   this.refreshing = true;
  //   this.subscriptions.push(
  //     this.userService.getUsers().subscribe(
  //       (response: User[]) => {
  //         this.userService.addUsersToLocalCache(response);
  //         this.users = response;
  //         this.refreshing = false;
  //         if (showNotification) {
  //           this.sendNotification(NotificationType.SUCCESS, `${response.length} user(s) loaded successfully.`);
  //         }
  //       },
  //       (errorResponse: HttpErrorResponse) => {
  //         this.sendNotification(NotificationType.ERROR, errorResponse.error.message);
  //         this.refreshing = false;
  //       }
  //     )
  //   );
  // }

  public getUsers(showNotification: boolean): void {
    this.refreshing = true;

    const subscription = this.userService.getUsers().subscribe({
      next: (response: User[]) => {
        this.userService.addUsersToLocalCache(response);
        this.users = response;
        this.refreshing = false;

        if (showNotification) {
          this.sendNotification(NotificationType.SUCCESS, `${response.length} user(s) loaded successfully.`);
        }
      },
      error: (errorResponse: HttpErrorResponse) => {
        this.sendNotification(NotificationType.ERROR, errorResponse.error.message);
        this.refreshing = false;
      },
    });

    this.subscriptions.push(subscription);
  }

  private sendNotification(notificationType: NotificationType, message: string): void {
    if (message) {
      this.notificationService.notify(notificationType, message);
    } else {
      this.notificationService.notify(notificationType, 'An error occurred. Please try again.');
    }
  }

  // private clickButton(buttonId: string): void {
  //   document.getElementById(buttonId).click();
  // }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

}
