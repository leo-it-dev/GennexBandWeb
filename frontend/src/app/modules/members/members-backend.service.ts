import { Injectable, Injector, signal, WritableSignal } from '@angular/core';
import { ApiInterfaceEmptyIn } from '../../../../../api_common/backend_call';
import { ApiInterfaceMembersOut, Member } from '../../../../../api_common/members';
import { BackendService } from '../../api/backend.service';

@Injectable({
	providedIn: 'root',
})
export class MembersBackendService extends BackendService {

	public static API_URL_MEMBERS = "/module/members/members"

	public members: WritableSignal<{ thumbnailPath: string, member: Member }[]> = signal([]);
	public thumbnailImageURLs: WritableSignal<string[]> = signal([]);
	public imagesLoaded = false;

	name(): string {
		return "Members";
	}

	constructor(
		override injector: Injector
	) {
		super(injector)

		this.anonymousBackendCall<ApiInterfaceEmptyIn, ApiInterfaceMembersOut>(MembersBackendService.API_URL_MEMBERS).then(dat => {
			let members: { thumbnailPath: string, member: Member }[] = [];
			for (let member of dat.members) {
				let basename = member.file;
				let sepIdx = basename.lastIndexOf(".");
				let stem = sepIdx != -1 ? basename.substring(0, sepIdx) : basename;
				let thumbnailURL = stem + "." + dat.thumbnailFormat;
				let bigURL = basename;
				
				members.push({
					thumbnailPath: dat.thumbnails + "/" + thumbnailURL,
					member: {
						file: bigURL,
						name: member.name,
						role: member.role
					}
				});
			}
			this.members.set(members);
			this.imagesLoaded = true;
			
		}).catch(err => {
			console.error("Error retrieving member data: ", err);
		});
	};
}
