import axios from 'axios';
export const api=axios.create({baseURL:'/api'});
api.interceptors.request.use(c=>{const t=localStorage.getItem('dh_token');if(t)c.headers.Authorization=`Bearer ${t}`;return c});
export async function request<T=any>(fn:()=>Promise<{data:T}>):Promise<T>{try{return (await fn()).data}catch(e:any){throw new Error(e.response?.data?.error||'Something went wrong')}}
