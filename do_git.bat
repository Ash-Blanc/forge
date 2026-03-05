@echo off
git branch -r > branch_list.txt 2>&1
git checkout -b waitlist >> checkout_log.txt 2>&1
git add . >> checkout_log.txt 2>&1
git commit -m "feat(landing): complete waitlist integration" >> checkout_log.txt 2>&1
git push -u origin waitlist >> checkout_log.txt 2>&1
echo Done >> checkout_log.txt
