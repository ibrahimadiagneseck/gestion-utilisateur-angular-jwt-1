import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticationService } from '../service/authentication.service';
import { UserService } from '../service/user.service';
import { NotificationService } from '../service/notification.service';
import { User } from '../model/user';
import { BehaviorSubject, Subscription } from 'rxjs';
import { FileUploadStatus } from '../model/file-upload.status';
import { NotificationType } from '../enum/notification-type.enum';
import { HttpErrorResponse, HttpEvent, HttpEventType } from '@angular/common/http';
import { NgForm } from '@angular/forms';
import { CustomHttpRespone } from '../model/custom-http-response';
import { Role } from '../enum/role.enum';

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
  public fileName: string | undefined | null;
  public profileImage: File | undefined | null;
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
    this.getUsers(true); // true : afficher la notification
  }


  // -----------------------List User-----------------------------------------------------------------------------

  public changeTitle(title: string): void {
    this.titleSubject.next(title);
  }


  public getUsers(showNotification: boolean): void {
    this.refreshing = true; // tourner l'icone actualiser

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

  public onSelectUser(selectedUser: User): void {
    this.selectedUser = selectedUser;
    this.clickButton('openUserInfo');
  }

  // ----------------------------------------------------------------------------------------------------




  // -----------------------New User-----------------------------------------------------------------------------

  public onProfileImageChange(event: Event): void {

    const target = event.target as HTMLInputElement;
    const files = target.files;

    if (files && files.length > 0) { // un fichier
      this.fileName = files[0].name;
      this.profileImage = files[0];
    }
  }

  public onAddNewUser(userForm: NgForm): void {

    if (this.profileImage instanceof File) {

      const formData = this.userService.createUserFormDate("", userForm.value, this.profileImage);

      this.subscriptions.push(
        this.userService.addUser(formData).subscribe({
          next: (response: User) => {
            this.clickButton('new-user-close');
            this.getUsers(false); // pas afficher le popup message
            this.fileName = null;
            this.profileImage = null;
            userForm.reset();
            this.sendNotification(NotificationType.SUCCESS, `${response.firstName} ${response.lastName} added successfully`);
          },
          error: (errorResponse: HttpErrorResponse) => {
            this.sendNotification(NotificationType.ERROR, errorResponse.error.message);
            this.profileImage = null;
          }
        })
      );
    }

  }

  public saveNewUser(): void {
    this.clickButton('new-user-save');
  }

  // ----------------------------------------------------------------------------------------------------





  // -----------------------Search User-----------------------------------------------------------------------------

  public searchUsers(searchTerm: string): void {

    const results: User[] = [];

    for (const user of this.userService.getUsersFromLocalCache()) {

      if (user.firstName.toLowerCase().indexOf(searchTerm.toLowerCase()) !== -1 ||
        user.lastName.toLowerCase().indexOf(searchTerm.toLowerCase()) !== -1 ||
        user.username.toLowerCase().indexOf(searchTerm.toLowerCase()) !== -1 ||
        user.userId.toLowerCase().indexOf(searchTerm.toLowerCase()) !== -1) {

        results.push(user);
      }
    }

    this.users = results;

    if (results.length === 0 || !searchTerm) {
      this.users = this.userService.getUsersFromLocalCache();
    }
  }

  // ----------------------------------------------------------------------------------------------------





  // -----------------------Edit User-----------------------------------------------------------------------------

  public onEditUser(editUser: User): void {

    this.editUser = editUser;
    this.currentUsername = editUser.username;
    this.clickButton('openUserEdit');
  }

  public onUpdateUser(): void {


    const formData = this.userService.createUserFormDate(this.currentUsername!, this.editUser, this.profileImage!);

    this.subscriptions.push(
      this.userService.updateUser(formData).subscribe({
        next: (response: User) => {
          this.clickButton('closeEditUserModalButton');
          this.getUsers(false);
          this.fileName = null;
          this.profileImage = null;
          this.sendNotification(NotificationType.SUCCESS, `${response.firstName} ${response.lastName} updated successfully`);
        },
        error: (errorResponse: HttpErrorResponse) => {
          this.sendNotification(NotificationType.ERROR, errorResponse.error.message);
          this.profileImage = null;
        }
      })
    );

  }

  // ----------------------------------------------------------------------------------------------------



  // -----------------------Delete User-----------------------------------------------------------------------------

  public onDeleteUder(username: string): void {

    this.subscriptions.push(
      this.userService.deleteUser(username).subscribe({
        next: (response: CustomHttpRespone) => {
          this.sendNotification(NotificationType.SUCCESS, response.message);
          this.getUsers(false);
        },
        error: (error: HttpErrorResponse) => {
          this.sendNotification(NotificationType.ERROR, error.error.message);
        }
      })
    );
  }

  // ----------------------------------------------------------------------------------------------------



  // -----------------------Reset User-----------------------------------------------------------------------------

  public onResetPassword(emailForm: NgForm): void {

    this.refreshing = true;
    const emailAddress = emailForm.value['reset-password-email'];

    this.subscriptions.push(
      this.userService.resetPassword(emailAddress).subscribe({
        next: (response: CustomHttpRespone) => {
          this.sendNotification(NotificationType.SUCCESS, response.message);
          this.refreshing = false;
        },
        error: (error: HttpErrorResponse) => {
          this.sendNotification(NotificationType.WARNING, error.error.message);
          this.refreshing = false;
        },
        complete: () => emailForm.reset()
      })
    );
  }

  // ----------------------------------------------------------------------------------------------------




  // -----------------------Profil User-----------------------------------------------------------------------------

  public onLogOut(): void {
    this.authenticationService.logOut();
    this.router.navigate(['/login']);
    this.sendNotification(NotificationType.SUCCESS, `You've been successfully logged out`);
  }


  public onUpdateCurrentUser(user: User): void {

    this.refreshing = true;
    this.currentUsername = this.authenticationService.getUserFromLocalCache().username;


    const formData = this.userService.createUserFormDate(this.currentUsername, user, this.profileImage!);

    this.subscriptions.push(
      this.userService.updateUser(formData).subscribe({
        next: (response: User) => {
          this.authenticationService.addUserToLocalCache(response);
          this.getUsers(false);
          this.fileName = null;
          this.profileImage = null;
          this.sendNotification(NotificationType.SUCCESS, `${response.firstName} ${response.lastName} updated successfully`);
        },
        error: (errorResponse: HttpErrorResponse) => {
          this.sendNotification(NotificationType.ERROR, errorResponse.error.message);
          this.refreshing = false;
          this.profileImage = null;
        }
      })
    );

  }


  public updateProfileImage(): void {
    this.clickButton('profile-image-input');
  }


  public onUpdateProfileImage(): void {

    const formData = new FormData();
    formData.append('username', this.user!.username);
    formData.append('profileImage', this.profileImage!);

    this.subscriptions.push(
      this.userService.updateProfileImage(formData).subscribe({
        next: (event: HttpEvent<any>) => {
          this.reportUploadProgress(event);
        },
        error: (errorResponse: HttpErrorResponse) => {
          this.sendNotification(NotificationType.ERROR, errorResponse.error.message);
          this.fileStatus.status = 'done';
        }
      })
    );
  }


  private reportUploadProgress(event: HttpEvent<any>): void {

    switch (event.type) {

      case HttpEventType.UploadProgress:
        this.fileStatus.percentage = Math.round(100 * event.loaded / event.total!);
        this.fileStatus.status = 'progress';
        break;

      case HttpEventType.Response:
        if (event.status === 200) {
          this.user!.profileImageUrl = `${event.body.profileImageUrl}?time=${new Date().getTime()}`;
          this.sendNotification(NotificationType.SUCCESS, `${event.body.firstName}\'s profile image updated successfully`);
          setTimeout(() => {
            this.fileStatus.status = 'done';
          }, 1000);
          break;
        } else {
          this.sendNotification(NotificationType.ERROR, `Unable to upload image. Please try again`);
          break;
        }

      default:
        `Finished all processes`;
    }
  }


  // ----------------------------------------------------------------------------------------------------





  // -----------------------Role User-----------------------------------------------------------------------------

  private getUserRole(): string {
    return this.authenticationService.getUserFromLocalCache().role;
  }

  public get isAdmin(): boolean {
    return this.getUserRole() === Role.ADMIN || this.getUserRole() === Role.SUPER_ADMIN;
  }

  public get isManager(): boolean {
    return this.isAdmin || this.getUserRole() === Role.MANAGER;
  }

  public get isAdminOrManager(): boolean {
    return this.isAdmin || this.isManager;
  }

  // ----------------------------------------------------------------------------------------------------





  // ----------------------------------------------------------------------------------------------------

  private clickButton(buttonId: string): void {
    document.getElementById(buttonId)?.click();
  }

  private sendNotification(notificationType: NotificationType, message: string): void {
    if (message) {
      this.notificationService.notify(notificationType, message);
    } else {
      this.notificationService.notify(notificationType, 'An error occurred. Please try again.');
    }
  }



  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }



}
