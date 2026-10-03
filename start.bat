@echo off
setlocal
cd /d "%~dp0"
title Ban do Di san Van hoa Viet Nam

rem 1) Uu tien Python di kem DeepSeek Harness (co san tren may nay)
if exist "C:\Users\Admin\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe" goto :run_dsh
rem 2) Thu python trong PATH
where python >nul 2>nul && goto :run_python
rem 3) Thu py launcher
where py >nul 2>nul && goto :run_py

echo [Loi] Khong tim thay Python.
echo Hay cai dat Python roi chay lai, hoac chay thu cong:
echo     python -m http.server 8000
pause
exit /b 1

:run_dsh
"C:\Users\Admin\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe" serve.py
goto :eof

:run_python
python serve.py
goto :eof

:run_py
py -3 serve.py
goto :eof
